'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Definisikan tipe data LENGKAP untuk laporan
interface ReportData {
  id: string;
  opnameDate: string;
  medicineName: string;
  jenisObat?: string;
  satuan?: string;
  expireDate?: string;
  asalBarang?: string;
  keadaanBulanLaluBaik: number;
  keadaanBulanLaluRusak: number;
  keadaanBulanLaluJml: number;
  pemasukanBaik: number;
  pemasukanRusak: number;
  pemasukanJml: number;
  pengeluaranBaik: number;
  pengeluaranRusak: number;
  pengeluaranJml: number;
  keadaanBulanLaporanBaik: number;
  keadaanBulanLaporanRusak: number;
  keadaanBulanLaporanJml: number;
  keterangan?: string;
}

interface ActionResponse {
    success: boolean;
    data?: ReportData[];
    error?: string;
}

interface DateRange {
    startDate: Date;
    endDate: Date;
}

export async function getReportDataAction({ startDate, endDate }: DateRange): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const stockOpnamesRef = db.collection("stock-opnames");
    const q = stockOpnamesRef
                .where('opnameDate', '>=', Timestamp.fromDate(startDate))
                .where('opnameDate', '<=', Timestamp.fromDate(endOfDay));

    const querySnapshot = await q.get();

    const data: ReportData[] = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
            id: doc.id,
            // Format tanggal menjadi string yang mudah dibaca
            opnameDate: format(docData.opnameDate.toDate(), "d LLL yyyy", { locale: id }),
            expireDate: docData.expireDate ? format(docData.expireDate.toDate(), "d LLL yyyy", { locale: id }) : '',
            
            // Ambil semua data lain dari dokumen
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