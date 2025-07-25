"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes, CircleDollarSign, Clock, Truck } from 'lucide-react';
import { useUser } from '@/contexts/UserProvider';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Medicine } from '@/lib/types';
import { differenceInDays, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState({
    totalMedicineTypes: 0,
    expiringSoonCount: 0,
    newlyReceivedCount: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let medQuery;
    if (user.role === 'admin') {
      medQuery = query(collection(db, "medicines"), where("location", "==", "dinas"));
    } else {
      medQuery = query(collection(db, "medicines"), where("userId", "==", user.id));
    }
    
    const unsubscribe = onSnapshot(medQuery, (querySnapshot) => {
        const meds: Medicine[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                expiryDate: (data.expiryDate as Timestamp).toDate(),
                dateAdded: data.dateAdded ? (data.dateAdded as Timestamp).toDate() : new Date(0) // Handle legacy data
            } as Medicine
        });

        // Calculate stats
        const totalMedicineTypes = meds.length;
        
        const expiringSoonCount = meds.filter(med => {
            const daysUntilExpiry = differenceInDays(med.expiryDate, new Date());
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        }).length;
        
        const sevenDaysAgo = subDays(new Date(), 7);
        const newlyReceivedCount = meds.filter(med => 
            (med.dateAdded || new Date(0)) >= sevenDaysAgo
        ).length;

        setStats({
            totalMedicineTypes,
            expiringSoonCount,
            newlyReceivedCount,
        });

        // Prepare chart data (simple count per unit type for now)
        const unitCounts = meds.reduce((acc, med) => {
            const key = med.unit || 'Lainnya';
            acc[key] = (acc[key] || 0) + (med.sisa_baik + med.sisa_rusak);
            return acc;
        }, {} as {[key: string]: number});

        const formattedChartData = Object.entries(unitCounts).map(([name, total]) => ({ name, total }));
        setChartData(formattedChartData);
        
        setLoading(false);
    }, (error) => {
        console.error("Error fetching dashboard data: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);


  if (loading) {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">
        Selamat Datang, {user?.name || 'Pengguna'}!
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jenis Obat</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMedicineTypes}</div>
            <p className="text-xs text-muted-foreground">di lokasi {user?.location || 'Anda'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Berdasarkan Satuan</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.length}</div>
            <p className="text-xs text-muted-foreground">Jenis satuan berbeda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Akan Kadaluarsa (H-30)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expiringSoonCount}</div>
            <p className="text-xs text-muted-foreground">Item perlu perhatian</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obat Baru Diterima</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.newlyReceivedCount}</div>
            <p className="text-xs text-muted-foreground">Dalam 7 hari terakhir</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Jumlah Stok Obat Berdasarkan Satuan</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                        contentStyle={{ 
                            background: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))', 
                            borderRadius: 'var(--radius)' 
                        }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
