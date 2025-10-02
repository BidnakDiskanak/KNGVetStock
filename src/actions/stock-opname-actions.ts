'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { User, StockOpname } from "@/lib/types";
import { z } from "zod";

// Skema validasi lengkap untuk data yang disimpan
const stockOpnameSchema = z.object({
  opnameDate: z.date(),
  medicineName: z.string().min(2, "Nama obat minimal 2 karakter."),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional().nullable(),
  asalBarang: z.string().optional(),
  keadaanBulanLaluBaik: z.coerce.number().min(0).default(0),
  keadaanBulanLaluRusak: z.coerce.number().min(0).default(0),
  pemasukanBaik: z.coerce.number().min(0).default(0),
  pemasukanRusak: z.coerce.number().min(0).default(0),
  pengeluaranBaik: z.coerce.number().min(0).default(0),
  pengeluaranRusak: z.coerce.number().min(0).default(0),
  keterangan: z.string().optional(),
  // Kolom kalkulasi
  keadaanBulanLaluJml: z.coerce.number().min(0).default(0),
  pemasukanJml: z.coerce.number().min(0).default(0),
  pengeluaranJml: z.coerce.number().min(0).default(0),
  keadaanBulanLaporanBaik: z.coerce.number().min(0).default(0),
  keadaanBulanLaporanRusak: z.coerce.number().min(0).default(0),
  keadaanBulanLaporanJml: z.coerce.number().min(0).default(0),
});


type ActionResponse = {
    success: boolean;
    data?: any;
    error?: string;
}

// Fungsi untuk membuat data
export async function createStockOpnameAction(formData: any, user: User): Promise<ActionResponse> {
  try {
    const validatedData = stockOpnameSchema.parse(formData);
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    await db.collection("stock-opnames").add({
      ...validatedData,
      userId: user.id,
      userLocation: user.location,
      userRole: user.role,
      createdAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating stock opname:", error);
    return { success: false, error: "Gagal menyimpan data." };
  }
}

// Fungsi untuk update data
export async function updateStockOpnameAction(id: string, formData: any, user: User): Promise<ActionResponse> {
  try {
    const validatedData = stockOpnameSchema.parse(formData);
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const docRef = db.collection("stock-opnames").doc(id);
    await docRef.update({
      ...validatedData,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating stock opname:", error);
    return { success: false, error: "Gagal memperbarui data." };
  }
}

// Fungsi untuk mengambil stok terakhir
export async function getLastStockAction(medicineName: string, expireDate: Date | undefined | null, user: User): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const db = getFirestore(app);
        const stockOpnamesRef = db.collection("stock-opnames");

        let q = stockOpnamesRef
            .where("medicineName", "==", medicineName)
            .where("userId", "==", user.id)
            .orderBy("opnameDate", "desc")
            .limit(1);
        
        if (expireDate) {
            q = q.where("expireDate", "==", Timestamp.fromDate(expireDate));
        } else {
            q = q.where("expireDate", "==", null);
        }

        const snapshot = await q.get();

        if (snapshot.empty) {
            return { success: true, data: null };
        }
        
        const lastStock = snapshot.docs[0].data() as StockOpname;
        return { success: true, data: lastStock };

    } catch (error: any) {
        console.error("Error getting last stock:", error);
        return { success: false, error: "Gagal mengambil data stok terakhir." };
    }
}


// --- FUNGSI HAPUS BATCH YANG SUDAH AMAN ---
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

        // --- INI PERBAIKANNYA ---
        // Query SEKARANG menyertakan `userId` untuk memastikan hanya data milik
        // pengguna yang benar yang akan diproses untuk dihapus.
        let q = stockOpnamesRef
            .where("medicineName", "==", payload.medicineName)
            .where("userId", "==", payload.userId); // <-- Filter WAJIB agar tidak salah hapus

        const snapshot = await q.get();

        if (snapshot.empty) {
            return { success: true };
        }

        const batch = db.batch();
        
        // Filter di sisi server untuk mencocokkan tanggal kadaluarsa (atau ketiadaannya)
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const docExpireDate = data.expireDate ? data.expireDate.toDate().toISOString() : null;
            const payloadExpireDate = payload.expireDate ? payload.expireDate.toISOString() : null;

            // Hapus jika tanggal kadaluarsanya cocok (atau jika keduanya tidak punya tanggal)
            if (docExpireDate === payloadExpireDate) {
                batch.delete(doc.ref);
            }
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting stock opname batch:", error);
        return { success: false, error: "Gagal menghapus riwayat data." };
    }
}
