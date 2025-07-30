'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp, Query } from "firebase-admin/firestore";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { User, ReportData } from "@/lib/types";

interface ActionResponse {
    success: boolean;
    data?: ReportData[];
    error?: string;
}

interface DateRange {
    endDate: Date;
}

export async function getReportDataAction({ endDate }: DateRange, user: User): Promise<ActionResponse> {
  try {
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const stockOpnamesRef = db.collection("stock-opnames");
    
    let q: Query = stockOpnamesRef.where('opnameDate', '<=', Timestamp.fromDate(endOfDay));

    // --- PERUBAHAN LOGIKA DIMULAI DI SINI ---
    if (user.role === 'admin') {
        // Laporan admin HANYA berisi data yang dimasukkan oleh admin
        q = q.where('userRole', '==', 'admin');
    } else {
        // Laporan UPTD HANYA berisi data dari UPTD tersebut
        q = q.where('userId', '==', user.id);
    }
    // --- PERUBAHAN LOGIKA SELESAI DI SINI ---

    const querySnapshot = await q.get();
    const allRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

    const data: ReportData[] = finalData.map(docData => {
        return {
            id: docData.id,
            opnameDate: format(docData.opnameDate.toDate(), "d LLL yyyy", { locale: id }),
            expireDate: docData.expireDate ? format(docData.expireDate.toDate(), "d LLL yyyy", { locale: id }) : '',
            medicineName: docData.medicineName || '',
            jenisObat: docData.jenisObat || '',
            satuan: docData.satuan || '',
            asalBarang: docData.asalBarang || '',
            keadaanBulanLaluBaik: docData.keadaanBulanLaluBaik || 0,
            keadaanBulanLaluRusak: docData.keadaanBulanLaluRusak || 0,
            keadaanBulanLaluJml: docData.keadaanBulanLaluJml || 0,
            pemasukanBaik: docData.pemasukanBaik || 0,
            pemasukanRusak: docData.pemasukanRusak || 0,
            pemasukanJml: docData.pemasukanJml || 0,
            pengeluaranBaik: docData.pengeluaranBaik || 0,
            pengeluaranRusak: docData.pengeluaranRusak || 0,
            pengeluaranJml: docData.pengeluaranJml || 0,
            keadaanBulanLaporanBaik: docData.keadaanBulanLaporanBaik || 0,
            keadaanBulanLaporanRusak: docData.keadaanBulanLaporanRusak || 0,
            keadaanBulanLaporanJml: docData.keadaanBulanLaporanJml || 0,
            keterangan: docData.keterangan || '',
        };
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("Error getting report data:", error);
    return { success: false, error: error.message || "Gagal mengambil data laporan." };
  }
}