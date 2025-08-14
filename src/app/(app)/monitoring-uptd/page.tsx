"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MonitoringData } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './components/data-table';
import { columns } from './components/columns';

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query mengambil semua data dari UPTD, diurutkan dari yang paling baru
    const q = query(
        collection(db, "stock-opnames"), 
        where("userRole", "==", "user"), 
        orderBy("opnameDate", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allMonitoringData: MonitoringData[] = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        const expireDate = docData.expireDate ? docData.expireDate.toDate() : null;
        return {
          id: doc.id,
          location: docData.userLocation || 'Lokasi Tidak Diketahui',
          medicineName: docData.medicineName || '',
          jenisObat: docData.jenisObat || '',
          satuan: docData.satuan || '',
          sisaStok: docData.keadaanBulanLaporanJml || 0,
          expireDate: expireDate && !isNaN(expireDate.getTime()) ? expireDate : null,
          keterangan: docData.keterangan || '',
        };
      });

      // --- PERBAIKAN LOGIKA DIMULAI DI SINI ---
      // Filter untuk menampilkan hanya data terbaru untuk setiap batch di setiap lokasi.
      const latestDataMap = new Map<string, MonitoringData>();

      for (const item of allMonitoringData) {
        const expireDateString = item.expireDate ? item.expireDate.toISOString() : 'no-expiry';
        // Kunci unik dibuat berdasarkan lokasi, nama obat, dan tanggal kadaluwarsa
        const key = `${item.location}|${item.medicineName}|${expireDateString}`;

        // Karena data sudah diurutkan dari yang terbaru (desc),
        // data pertama yang kita temukan untuk setiap kunci adalah yang paling baru.
        if (!latestDataMap.has(key)) {
          latestDataMap.set(key, item);
        }
      }

      const filteredData = Array.from(latestDataMap.values());
      // --- PERBAIKAN LOGIKA SELESAI ---

      setData(filteredData);
      setLoading(false);
    }, (error) => {
        console.error("Gagal memuat data monitoring:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    );
  }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Monitoring UPTD</h2>
          <p className="text-muted-foreground">
            Berikut adalah rekapitulasi stok obat terbaru dari semua UPTD.
          </p>
        </div>
      </div>
      <DataTable data={data} columns={columns} filterColumn="location" />
    </div>
  );
}
