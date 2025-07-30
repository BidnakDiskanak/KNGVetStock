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
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const stockOpnamesRef = db.collection("stock-opnames");
    
    let q: Query = stockOpnamesRef;

    if (user.role === 'admin') {
        q = q.where('userRole', '==', 'user');
    } else {
        q = q.where('userId', '==', user.id);
    }

    const querySnapshot = await q.get();
    const allRecords = querySnapshot.docs.map(doc => doc.data());

    if (allRecords.length === 0) {
        return { success: true, data: { totalObat: 0, totalStok: 0, stokMenipis: 0, akanKadaluarsa: 0, obatStokMenipis: [], allMedicineStock: [], obatAkanKadaluarsa: [] } };
    }

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
    
    const totalObat = finalData.length;
    const totalStok = finalData.reduce((sum, item) => sum + (item.keadaanBulanLaporanJml || 0), 0);
    
    const stokMenipisThreshold = 10;
    const obatStokMenipis = finalData.filter(item => item.keadaanBulanLaporanJml < stokMenipisThreshold);
    const stokMenipis = obatStokMenipis.length;

    // --- LOGIKA BARU UNTUK KADALUARSA ---
    const expiryThreshold = new Date();
    expiryThreshold.setMonth(expiryThreshold.getMonth() + 1); // Batas waktu 1 bulan dari sekarang
    const akanKadaluarsaItems = finalData.filter(item => 
        item.expireDate && item.expireDate.toDate() < expiryThreshold
    );
    const akanKadaluarsa = akanKadaluarsaItems.length;

    const stats: DashboardStats = {
        totalObat,
        totalStok,
        stokMenipis,
        akanKadaluarsa,
        obatStokMenipis: obatStokMenipis.map(item => ({
            medicineName: item.medicineName,
            sisaStok: item.keadaanBulanLaporanJml,
            lokasi: item.userLocation || ''
        })),
        allMedicineStock: finalData.map(item => ({
            name: item.medicineName,
            value: item.keadaanBulanLaporanJml,
        })),
        // --- DATA BARU UNTUK DASHBOARD ---
        obatAkanKadaluarsa: akanKadaluarsaItems.map(item => ({
            medicineName: item.medicineName,
            expireDate: format(item.expireDate.toDate(), "d LLL yyyy", { locale: id }),
            lokasi: item.userLocation || ''
        }))
    };

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: "Gagal mengambil data dashboard." };
  }
}