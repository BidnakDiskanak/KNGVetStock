"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StockOpname } from '@/lib/types';
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useUser } from '@/contexts/UserProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './components/data-table-laporan'; // Anda mungkin perlu membuat komponen data-table khusus untuk laporan
import { getLaporanColumns } from './components/columns-laporan'; // Dan juga komponen columns khusus untuk laporan

// Komponen ini adalah contoh. Anda perlu menyesuaikan 'DataTable' dan 'Columns' sesuai kebutuhan laporan.
export default function LaporanPage() {
  const [laporanData, setLaporanData] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    // Untuk laporan, admin biasanya bisa melihat semua data,
    // jadi kita tidak memfilter berdasarkan userId atau userRole kecuali ada kebutuhan khusus.
    const q = query(collection(db, "stock-opnames"));
    
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

      // --- LOGIKA FILTER DATA TERBARU DITERAPKAN DI SINI ---
      // 1. Kelompokkan semua data berdasarkan batch unik (nama obat + tanggal ED)
      const recordsByBatch: { [key: string]: StockOpname[] } = {};
      for (const record of opnamesData) {
          const expireDateString = record.expireDate ? record.expireDate.toISOString() : 'no-expiry';
          // Kunci unik menggunakan nama obat dan tanggal kadaluwarsa
          const key = `${record.medicineName}|${expireDateString}`;
          if (!recordsByBatch[key]) {
              recordsByBatch[key] = [];
          }
          recordsByBatch[key].push(record);
      }

      // 2. Dari setiap kelompok, ambil hanya data yang paling baru berdasarkan tanggal opname
      const latestRecords = Object.values(recordsByBatch).map(records => {
          return records.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime())[0];
      });
      
      // 3. Urutkan hasil akhir berdasarkan tanggal opname terbaru agar yang paling baru muncul di atas
      latestRecords.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime());

      setLaporanData(latestRecords);
      // --- AKHIR LOGIKA FILTER ---

      setLoading(false);
    }, (error) => {
        console.error("Gagal mengambil data laporan:", error);
        setLoading(false);
        toast({
            title: "Gagal Memuat Laporan",
            description: "Tidak dapat mengambil data untuk laporan. Coba lagi nanti.",
            variant: "destructive",
        })
    });

    return () => unsubscribe();
    
  }, [user, toast]);
  
  // Kolom untuk tabel laporan, Anda bisa menyesuaikannya
  const columns = useMemo(() => getLaporanColumns(), []);

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
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Laporan Stok Opname</h2>
                <p className="text-muted-foreground">
                    Berikut adalah daftar stok opname terbaru untuk setiap batch obat.
                </p>
            </div>
        </div>
        <DataTable data={laporanData} columns={columns} filterColumn="medicineName"/>
      </div>
    </>
  );
}
