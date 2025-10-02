"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StockOpname } from '@/lib/types';
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useUser } from '@/contexts/UserProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DataTable } from './components/data-table';
import { getColumns, type StockOpnameActionHandlers } from './components/columns';
import { StockOpnameFormSheet } from './components/stock-opname-form-sheet';
import { deleteStockOpnameBatchAction } from '@/actions/stock-opname-actions';

export default function StockOpnamePage() {
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [opnameToContinue, setOpnameToContinue] = useState<StockOpname | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [opnameToDelete, setOpnameToDelete] = useState<StockOpname | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    let q;
    const baseQuery = collection(db, "stock-opnames");

    // --- PERBAIKAN LOGIKA DI SINI ---
    if (user.role !== 'admin') {
      // Untuk UPTD, tampilkan hanya data milik mereka
        q = query(baseQuery, where("userId", "==", user.id));
    } else {
        // Untuk admin, tampilkan hanya data yang dibuat oleh admin
        q = query(baseQuery, where("userRole", "==", "admin"));
    }
    // --- AKHIR PERBAIKAN ---
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const opnamesData: StockOpname[] = [];
      querySnapshot.forEach(doc => {
          const data = doc.data();
          const opnameDate = data.opnameDate?.toDate();
          const expireDate = data.expireDate?.toDate();

          if (!opnameDate || isNaN(opnameDate.getTime())) {
              console.warn(`Melewati dokumen ${doc.id} karena opnameDate tidak valid.`);
              return;
          }

          opnamesData.push({
              id: doc.id,
              ...data,
              opnameDate: opnameDate,
              expireDate: expireDate && !isNaN(expireDate.getTime()) ? expireDate : undefined,
          } as StockOpname);
      });

      const recordsByBatch: { [key: string]: StockOpname[] } = {};
      for (const record of opnamesData) {
          const expireDateString = record.expireDate ? record.expireDate.toISOString() : 'no-expiry';
        // Kunci unik tidak perlu userId karena data sudah difilter per pengguna
          const key = `${record.medicineName}|${expireDateString}`; 
          if (!recordsByBatch[key]) {
              recordsByBatch[key] = [];
          }
          recordsByBatch[key].push(record);
      }

      const latestRecords = Object.values(recordsByBatch).map(records => {
          return records.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime())[0];
      });
      
      latestRecords.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime());

      setStockOpnames(latestRecords);
      setLoading(false);
    }, (error) => {
        console.error("Gagal mengambil data stock opname:", error);
        setLoading(false);
        toast({
            title: "Gagal Memuat Data",
            description: "Tidak dapat mengambil data. Coba lagi nanti.",
            variant: "destructive",
        })
    });

    return () => unsubscribe();
    
  }, [user, toast]);

  // --- HANDLER BARU: Memastikan state bersih saat form ditutup ---
  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      // Saat form ditutup, reset semua state agar bersih saat dibuka lagi
      setSelectedOpname(null);
      setOpnameToContinue(null);
    }
  }

  const handleAdd = () => {
    setSelectedOpname(null);
    setOpnameToContinue(null);
    setIsSheetOpen(true);
  }

  const handleEdit = (opname: StockOpname) => {
    setSelectedOpname(opname);
    setOpnameToContinue(null);
    setIsSheetOpen(true);
  }

  const handleContinue = (opname: StockOpname) => {
    setSelectedOpname(null);
    setOpnameToContinue(opname);
    setIsSheetOpen(true);
  };

  const openDeleteDialog = (opname: StockOpname) => {
    setOpnameToDelete(opname);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!opnameToDelete) return;
    
    const payload = {
      medicineName: opnameToDelete.medicineName,
      expireDate: opnameToDelete.expireDate,
      userId: opnameToDelete.userId,
    };

    const result = await deleteStockOpnameBatchAction(payload);

    if (result.success) {
        toast({
            title: "Data Dihapus",
            description: `Seluruh riwayat untuk ${opnameToDelete.medicineName} telah berhasil dihapus.`,
        });
    } else {
        toast({
            title: "Gagal Menghapus",
            description: result.error || "Terjadi kesalahan saat menghapus data.",
            variant: "destructive",
        });
    }
    setIsDeleteDialogOpen(false);
    setOpnameToDelete(null);
  };

  const handlers: StockOpnameActionHandlers = {
    onEdit: handleEdit,
    onDelete: openDeleteDialog,
    onContinue: handleContinue,
  };
  
  const columns = useMemo(() => getColumns(handlers), [handlers]);

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
        <DataTable data={stockOpnames} columns={columns} onAdd={handleAdd} filterColumn="medicineName"/>
      </div>

      <StockOpnameFormSheet 
        isOpen={isSheetOpen}
        setIsOpen={handleSheetOpenChange} // Gunakan handler baru
        opnameData={selectedOpname}
        continueData={opnameToContinue}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus <strong>seluruh riwayat</strong> data stock opname untuk <strong>{opnameToDelete?.medicineName}</strong> (batch {opnameToDelete?.expireDate ? format(opnameToDelete.expireDate, "LLL yyyy", { locale: id }) : 'tanpa ED'}) secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
