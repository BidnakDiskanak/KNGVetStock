'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp, Query } from "firebase-admin/firestore";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { User, DashboardStats } from "@/lib/types";

interface ActionResponse {
    success: boolean;
    data?: DashboardStats;
    error?: string;
}

export async function getDashboardStatsAction(user: User): Promise<ActionResponse> {
  try {
    console.log("--- Memulai getDashboardStatsAction ---");
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const stockOpnamesRef = db.collection("stock-opnames");
    
    let q: Query = stockOpnamesRef;

    if (user.role === 'admin') {
        console.log("Mode Admin: Memfilter data dengan userRole == 'admin'");
        q = q.where('userRole', '==', 'admin');
    } else {
        console.log(`Mode User UPTD: Memfilter data dengan userId == ${user.id}`);
        q = q.where('userId', '==', user.id);
    }

    const querySnapshot = await q.get();
    const allRecords = querySnapshot.docs.map(doc => doc.data());
    console.log(`Ditemukan ${allRecords.length} total catatan dari Firestore.`);

    if (allRecords.length === 0) {
        console.log("Tidak ada catatan, mengembalikan statistik kosong.");
        return { success: true, data: { totalObat: 0, totalStok: 0, stokMenipis: 0, akanKadaluarsa: 0, obatStokMenipis: [], allMedicineStock: [], obatAkanKadaluarsa: [] } };
    }

    const recordsByBatch: { [key: string]: any[] } = {};
    for (const record of allRecords) {
        const expireDateString = record.expireDate ? record.expireDate.toDate().toISOString() : 'no-expiry';
        const key = `${record.medicineName}|${expireDateString}`;
        if (!recordsByBatch[key]) {
            recordsByBatch[key] = [];
        }
        recordsByBatch[key].push(record);
    }

    const latestBatchRecords = Object.values(recordsByBatch).map(records => {
        return records.sort((a, b) => b.opnameDate.toDate() - a.opnameDate.toDate())[0];
    });

    const finalData = latestBatchRecords.filter(record => record.keadaanBulanLaporanJml > 0);
    console.log(`Ditemukan ${finalData.length} batch obat yang aktif (stok > 0).`);
    
    const totalStok = finalData.reduce((sum, item) => sum + (item.keadaanBulanLaporanJml || 0), 0);
    console.log(`Kalkulasi Total Stok: ${totalStok}`);
    
    const uniqueMedicineNames = new Set(finalData.map(item => item.medicineName));
    const totalObat = uniqueMedicineNames.size;

    const expiryThreshold = new Date();
    expiryThreshold.setMonth(expiryThreshold.getMonth() + 1); 
    const akanKadaluarsaItems = finalData.filter(item => 
        item.expireDate && item.expireDate.toDate() < expiryThreshold
    );
    const akanKadaluarsa = akanKadaluarsaItems.reduce((sum, item) => sum + (item.keadaanBulanLaporanJml || 0), 0);
    console.log(`Kalkulasi Akan Kadaluarsa (jumlah unit): ${akanKadaluarsa}`);

    const stockByName: { [key: string]: { total: number, lokasi: string } } = {};
    finalData.forEach(item => {
        if (!stockByName[item.medicineName]) {
            stockByName[item.medicineName] = { total: 0, lokasi: item.userLocation || '' };
        }
        stockByName[item.medicineName].total += item.keadaanBulanLaporanJml;
    });

    const stokMenipisThreshold = 50;
    const obatStokMenipis = Object.entries(stockByName)
        .filter(([name, data]) => data.total < stokMenipisThreshold)
        .map(([medicineName, data]) => ({ 
            medicineName, 
            sisaStok: data.total, 
            lokasi: data.lokasi 
        }));
    const stokMenipis = obatStokMenipis.length;
    
    const allMedicineStock = Object.entries(stockByName).map(([name, data]) => ({
        name,
        value: data.total
    }));

    const stats: DashboardStats = {
        totalObat,
        totalStok,
        stokMenipis,
        akanKadaluarsa,
        obatStokMenipis,
        allMedicineStock,
        obatAkanKadaluarsa: akanKadaluarsaItems.map(item => ({
            medicineName: item.medicineName,
            expireDate: format(item.expireDate.toDate(), "d LLL yyyy", { locale: id }),
            lokasi: item.userLocation || ''
        }))
    };
    
    console.log("--- Selesai getDashboardStatsAction, hasil akhir:", stats);
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("--- ERROR di getDashboardStatsAction ---:", error);
    return { success: false, error: "Gagal mengambil data dashboard." };
  }
}