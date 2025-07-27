"use client"

import { useEffect, useMemo, useState } from 'react';
import { getColumns, type MedicineActionHandlers } from './components/columns';
import { DataTable } from './components/data-table';
import type { Medicine } from '@/lib/types';
import { collection, onSnapshot, query, doc, deleteDoc, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicineFormSheet } from './components/medicine-form-sheet';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUser } from '@/contexts/UserProvider';
// <-- TAMBAHKAN IMPORT INI
import { StockOpnameForm } from './components/stock-opname-form'; 

export default function StockOpnamePage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    let medQuery;
    if (user.role === 'admin') {
      medQuery = query(collection(db, "medicines"), where("location", "==", "dinas"));
    } else {
      medQuery = query(collection(db, "medicines"), where("userId", "==", user.id));
    }
    
    const unsubscribe = onSnapshot(medQuery, (querySnapshot) => {
      const medsData: Medicine[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          expiryDate: (data.expiryDate as Timestamp).toDate(),
        } as Medicine;
      });
      setMedicines(medsData);
      setLoading(false);
    }, (error) => {
        console.error("Failed to fetch medicines:", error);
        setLoading(false);
        toast({
            title: "Gagal Memuat Data",
            description: "Tidak dapat mengambil data stok. Coba lagi nanti.",
            variant: "destructive",
        })
    });

    return () => unsubscribe();
    
  }, [user, toast]);

  const handleAdd = () => {
    setSelectedMedicine(null);
    setIsSheetOpen(true);
  }

  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setIsSheetOpen(true);
  }

  const openDeleteDialog = (medicineId: string) => {
    setMedicineToDelete(medicineId);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!medicineToDelete) return;
    
    try {
        await deleteDoc(doc(db, "medicines", medicineToDelete));
        toast({
            title: "Data Dihapus",
            description: "Data obat telah berhasil dihapus.",
        });
    } catch (error) {
        toast({
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus data.",
            variant: "destructive",
        });
    } finally {
        setIsDeleteDialogOpen(false);
        setMedicineToDelete(null);
    }
  };


  const handlers: MedicineActionHandlers = {
    onEdit: handleEdit,
    onDelete: (medicineId) => openDeleteDialog(medicineId),
  };
  
  const columns = useMemo(() => getColumns(handlers, user?.role), [user, handlers]);


  if (loading) {
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
      )
  }

  return (
    <>
      <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
        
        {/* BAGIAN FORMULIR BARU */}
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pencatatan Stock Opname</h2>
            <p className="text-muted-foreground">
              Masukkan data stok obat historis di sini.
            </p>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <StockOpnameForm />
        </div>

        {/* BAGIAN DAFTAR OBAT ANDA YANG SUDAH ADA */}
        <div className="flex items-center justify-between space-y-2 pt-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Daftar Master Obat {user?.location || ''}</h2>
              <p className="text-muted-foreground">
                Berikut adalah daftar obat-obatan yang tersedia di lokasi Anda.
              </p>
            </div>
        </div>
        <DataTable data={medicines} columns={columns} onAdd={handleAdd} filterColumn="name"/>
      </div>

      <MedicineFormSheet 
        isOpen={isSheetOpen}
        setIsOpen={setIsSheetOpen}
        medicine={selectedMedicine}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data obat secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}