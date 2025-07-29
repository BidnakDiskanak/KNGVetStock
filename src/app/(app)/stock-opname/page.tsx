"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
import { deleteStockOpnameAction } from '@/actions/stock-opname-actions';

export default function StockOpnamePage() {
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [opnameToDelete, setOpnameToDelete] = useState<StockOpname | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const q = query(collection(db, "stock-opnames"), orderBy("opnameDate", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const opnamesData: StockOpname[] = [];
      querySnapshot.forEach(doc => {
          const data = doc.data();

          const opnameDate = data.opnameDate && typeof data.opnameDate.toDate === 'function' 
              ? data.opnameDate.toDate() 
              : null;

          if (!opnameDate || isNaN(opnameDate.getTime())) {
              console.warn(`Melewati dokumen ${doc.id} karena opnameDate tidak valid:`, data.opnameDate);
              return; 
          }

          const expireDate = data.expireDate && typeof data.expireDate.toDate === 'function'
              ? data.expireDate.toDate()
              : undefined;

          opnamesData.push({
              id: doc.id,
              medicineName: data.medicineName || "Nama Tidak Ditemukan",
              opnameDate: opnameDate,
              expireDate: expireDate && !isNaN(expireDate.getTime()) ? expireDate : undefined,
              jenisObat: data.jenisObat || '',
              satuan: data.satuan || '',
              asalBarang: data.asalBarang || '',
              keadaanBulanLaluBaik: data.keadaanBulanLaluBaik || 0,
              keadaanBulanLaluRusak: data.keadaanBulanLaluRusak || 0,
              keadaanBulanLaluJml: data.keadaanBulanLaluJml || 0,
              pemasukanBaik: data.pemasukanBaik || 0,
              pemasukanRusak: data.pemasukanRusak || 0,
              pemasukanJml: data.pemasukanJml || 0,
              pengeluaranBaik: data.pengeluaranBaik || 0,
              pengeluaranRusak: data.pengeluaranRusak || 0,
              pengeluaranJml: data.pengeluaranJml || 0,
              keadaanBulanLaporanBaik: data.keadaanBulanLaporanBaik || 0,
              keadaanBulanLaporanRusak: data.keadaanBulanLaporanRusak || 0,
              keadaanBulanLaporanJml: data.keadaanBulanLaporanJml || 0,
              keterangan: data.keterangan || '',
          } as StockOpname);
      });

      setStockOpnames(opnamesData);
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

  const handleAdd = () => {
    setSelectedOpname(null);
    setIsSheetOpen(true);
  }

  const handleEdit = (opname: StockOpname) => {
    setSelectedOpname(opname);
    setIsSheetOpen(true);
  }

  const openDeleteDialog = (opname: StockOpname) => {
    setOpnameToDelete(opname);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!opnameToDelete) return;

    const result = await deleteStockOpnameAction(opnameToDelete.id);

    if (result.success) {
        toast({
            title: "Data Dihapus",
            description: `Data stock opname untuk ${opnameToDelete.medicineName} telah berhasil dihapus.`,
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
        setIsOpen={setIsSheetOpen}
        opnameData={selectedOpname}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus data stock opname untuk <strong>{opnameToDelete?.medicineName}</strong> pada tanggal <strong>{opnameToDelete?.opnameDate ? format(opnameToDelete.opnameDate, "d LLL yyyy", { locale: id }) : ''}</strong> secara permanen.
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