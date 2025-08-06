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
    
    let q: Query = stockOpnamesRef
                .where('opnameDate', '<=', Timestamp.fromDate(endOfDay));

    if (user.role === 'admin') {
        q = q.where('userRole', '==', 'admin');
    } else {
        q = q.where('userId', '==', user.id);
    }
    
    const querySnapshot = await q.get();
    const allRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // --- PERUBAHAN LOGIKA DIMULAI DI SINI ---
    // 1. Lakukan pengurutan data di server sebelum mengirimkannya
    allRecords.sort((a, b) => {
        // Urutan pertama: berdasarkan nama obat (abjad, case-insensitive)
        const nameA = (a.medicineName || '').toLowerCase();
        const nameB = (b.medicineName || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        // Urutan kedua: jika nama sama, urutkan berdasarkan tanggal kadaluarsa (yang paling cepat akan di atas)
        // Anggap data tanpa tanggal kadaluarsa sebagai tanggal yang paling jauh di masa depan
        const dateA = a.expireDate ? a.expireDate.toDate().getTime() : Infinity; 
        const dateB = b.expireDate ? b.expireDate.toDate().getTime() : Infinity;
        return dateA - dateB;
    });
    // --- PERUBAHAN LOGIKA SELESAI DI SINI ---

    const data: ReportData[] = allRecords.map(docData => {
        const expireDate = docData.expireDate ? docData.expireDate.toDate() : null;
        return {
            id: docData.id,
            opnameDate: docData.opnameDate.toDate(),
            expireDate: expireDate && !isNaN(expireDate.getTime()) ? expireDate : null,
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