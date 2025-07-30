'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp, Query } from "firebase-admin/firestore";
import type { User, DashboardStats } from "@/lib/types";

interface ActionResponse {
    success: boolean;
    data?: DashboardStats;
    error?: string;
}

export async function getDashboardStatsAction(user: User): Promise<ActionResponse> {
  try {
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const stockOpnamesRef = db.collection("stock-opnames");
    
    let q: Query = stockOpnamesRef;

    // Filter data berdasarkan peran pengguna
    if (user.role === 'admin') {
        // Admin melihat rekapitulasi dari semua UPTD
        q = q.where('userRole', '==', 'user');
    } else {
        // User UPTD hanya melihat datanya sendiri
        q = q.where('userId', '==', user.id);
    }

    const querySnapshot = await q.get();
    const allRecords = querySnapshot.docs.map(doc => doc.data());

    if (allRecords.length === 0) {
        return { success: true, data: { totalObat: 0, totalStok: 0, stokMenipis: 0, akanKadaluarsa: 0, obatStokMenipis: [] } };
    }

    // --- Logika untuk mendapatkan data terbaru per obat ---
    const recordsByMedicine: { [key: string]: any[] } = {};
    for (const record of allRecords) {
        if (!recordsByMedicine[record.medicineName]) {
            recordsByMedicine[record.medicineName] = [];
        }
        recordsByMedicine[record.medicineName].push(record);
    }

    const latestRecords = Object.values(recordsByMedicine).map(records => {
        return records.sort((a, b) => b.opnameDate.toDate() - a.opnameDate.toDate())[0];
    });

    const finalData = latestRecords.filter(record => record.keadaanBulanLaporanJml > 0);
    
    // --- Kalkulasi Statistik ---
    const totalObat = finalData.length;
    const totalStok = finalData.reduce((sum, item) => sum + (item.keadaanBulanLaporanJml || 0), 0);
    
    const stokMenipisThreshold = 10; // Anggap stok menipis jika < 10
    const obatStokMenipis = finalData.filter(item => item.keadaanBulanLaporanJml < stokMenipisThreshold);
    const stokMenipis = obatStokMenipis.length;

    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 30); // Anggap akan kadaluarsa dalam 30 hari
    const akanKadaluarsa = finalData.filter(item => 
        item.expireDate && item.expireDate.toDate() < expiryThreshold
    ).length;

    const stats: DashboardStats = {
        totalObat,
        totalStok,
        stokMenipis,
        akanKadaluarsa,
        obatStokMenipis: obatStokMenipis.map(item => ({
            medicineName: item.medicineName,
            sisaStok: item.keadaanBulanLaporanJml,
            lokasi: item.userLocation || ''
        }))
    };

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: "Gagal mengambil data dashboard." };
  }
}