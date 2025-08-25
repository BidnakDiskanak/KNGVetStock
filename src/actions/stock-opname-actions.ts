'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { User } from "@/lib/types";
import { z } from "zod";

// --- PERBAIKAN 1: Buat skema validasi yang lengkap ---
// Skema ini mencakup semua data dari form DAN hasil kalkulasi
const stockOpnameSchema = z.object({
  opnameDate: z.date(),
  medicineName: z.string().min(2),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional(),
  asalBarang: z.string().optional(),
  keadaanBulanLaluBaik: z.number().min(0),
  keadaanBulanLaluRusak: z.number().min(0),
  pemasukanBaik: z.number().min(0),
  pemasukanRusak: z.number().min(0),
  pengeluaranBaik: z.number().min(0),
  pengeluaranRusak: z.number().min(0),
  keterangan: z.string().optional(),
  // Tambahkan field hasil kalkulasi
  keadaanBulanLaluJml: z.number(),
  pemasukanJml: z.number(),
  pengeluaranJml: z.number(),
  keadaanBulanLaporanBaik: z.number(),
  keadaanBulanLaporanRusak: z.number(),
  keadaanBulanLaporanJml: z.number(),
});

type StockOpnameData = z.infer<typeof stockOpnameSchema>;

type ActionResponse = {
    success: boolean;
    data?: any;
    error?: string;
}

// --- PERBAIKAN 2: Implementasi fungsi create ---
export async function createStockOpnameAction(formData: StockOpnameData, user: User): Promise<ActionResponse> {
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

// --- PERBAIKAN 3: Implementasi fungsi update ---
export async function updateStockOpnameAction(id: string, formData: StockOpnameData, user: User): Promise<ActionResponse> {
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
export async function getLastStockAction(medicineName: string, expireDate: Date | undefined, user: User): Promise<ActionResponse> {
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

        const lastStock = snapshot.docs[0].data();
        return { success: true, data: lastStock };
    } catch (error: any) {
        console.error("Error getting last stock:", error);
        return { success: false, error: "Gagal mengambil data stok terakhir." };
    }
}

// Fungsi hapus batch
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

        let q = stockOpnamesRef
            .where("medicineName", "==", payload.medicineName)
            .where("userId", "==", payload.userId);

        if (payload.expireDate) {
            q = q.where("expireDate", "==", Timestamp.fromDate(payload.expireDate));
        } else {
            q = q.where("expireDate", "==", null);
        }

        const snapshot = await q.get();
        if (snapshot.empty) {
            return { success: true };
        }

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
