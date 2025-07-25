"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Medicine, User } from '@/lib/types';
import { useUser } from '@/contexts/UserProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/app/(app)/stock-opname/components/data-table';
import { getMonitoringColumns } from './components/columns';

export default function MonitoringUptdPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Redirect if not admin
    useEffect(() => {
        if (!userLoading && user?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [user, userLoading, router]);

    // Fetch UPTD data
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        // 1. Fetch all users first and create a map for easy lookup.
        const usersQuery = query(collection(db, "users"));
        
        getDocs(usersQuery).then(usersSnapshot => {
            const usersMap = new Map<string, User>();
            usersSnapshot.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));

            // 2. Now, set up the listener for medicines from all UPTD locations.
            const medQuery = query(collection(db, "medicines"), where("location", "==", "uptd"));
            
            const unsubscribe = onSnapshot(medQuery, (querySnapshot) => {
                const meds = querySnapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        // 3. Use the map to find the user and their location via userId.
                        const medicineCreator = data.userId ? usersMap.get(data.userId) : undefined;

                        return {
                            ...data,
                            id: doc.id,
                            expiryDate: data.expiryDate.toDate(),
                            // Use the fetched location, or provide a fallback
                            locationName: medicineCreator?.location || 'Lokasi Tidak Diketahui',
                        } as Medicine;
                    })
                    // 4. Filter out medicines that do not have a userId to hide old/incomplete data
                    .filter(med => !!med.userId); 

                setMedicines(meds);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching medicines:", error);
                setLoading(false);
            });

            // Return the unsubscribe function to clean up the listener
            return unsubscribe;
        }).catch(error => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

    }, [user]);

    const columns = useMemo(() => getMonitoringColumns(), []);

    if (loading || userLoading || user?.role !== 'admin') {
        return (
             <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Monitoring Stok UPTD</h2>
          <p className="text-muted-foreground">
            Lihat data stok obat dari semua UPTD dalam mode read-only.
          </p>
        </div>
      </div>
      <DataTable data={medicines} columns={columns} filterColumn="locationName" />
    </div>
  );
}
