'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { User, StockOpname } from "@/lib/types";
import { z } from "zod";

// Skema validasi untuk data yang masuk ke form
const formSchema = z.object({
  opnameDate: z.date(),
  medicineName: z.string().min(2),
  expireDate: z.date().optional(),
  // ... (tambahkan field lain sesuai form Anda)
});

type ActionResponse = {
    success: boolean;
    data?: any;
    error?: string;
}

// Fungsi untuk membuat data (diasumsikan sudah ada)
export async function createStockOpnameAction(formData: any, user: User): Promise<ActionResponse> {
    // ... (logika create Anda)
    return { success: true };
}

// Fungsi untuk update data (diasumsikan sudah ada)
export async function updateStockOpnameAction(id: string, formData: any, user: User): Promise<ActionResponse> {
    // ... (logika update Anda)
    return { success: true };
}

// Fungsi untuk mengambil stok terakhir (diasumsikan sudah ada)
export async function getLastStockAction(medicineName: string, expireDate: Date | undefined, user: User): Promise<ActionResponse> {
    // ... (logika getLastStock Anda)
    return { success: true, data: null };
}

// --- FUNGSI HAPUS BATCH BARU ---
interface DeleteBatchPayload {
    medicineName: string;
    expireDate?: Date;
    userId: string;
}

export async function deleteStockOpnameBatchAction(payload: DeleteBatchPayload): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const db = getFirestore(app);
        const stockOpnamesRef = db.collection("stock-opnames");

        // Buat query berdasarkan nama obat dan ID pengguna
        let q = stockOpnamesRef
            .where("medicineName", "==", payload.medicineName)
            .where("userId", "==", payload.userId);

        // Tambahkan filter tanggal kadaluarsa jika ada
        if (payload.expireDate) {
            q = q.where("expireDate", "==", Timestamp.fromDate(payload.expireDate));
        } else {
            // Jika tidak ada, cari yang tanggalnya null atau tidak ada sama sekali
            q = q.where("expireDate", "==", null);
        }

        const snapshot = await q.get();

        if (snapshot.empty) {
            return { success: true }; // Tidak ada yang dihapus, tapi proses berhasil
        }

        // Hapus semua dokumen yang ditemukan dalam satu batch
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting stock opname batch:", error);
        return { success: false, error: "Gagal menghapus riwayat data." };
    }
}
