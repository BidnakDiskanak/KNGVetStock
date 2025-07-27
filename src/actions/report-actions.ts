'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface ReportData {
  id: string;
  medicineName: string;
  quantity: number;
  opnameDate: string;
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

    // Pastikan tanggal akhir mencakup keseluruhan hari
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
            medicineName: docData.medicineName,
            quantity: docData.quantity,
            // Format timestamp menjadi string tanggal yang mudah dibaca
            opnameDate: format(docData.opnameDate.toDate(), "PPP", { locale: id }),
        };
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("Error getting report data:", error);
    return { success: false, error: error.message || "Gagal mengambil data laporan." };
  }
}