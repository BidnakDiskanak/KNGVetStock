'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

type ActionResponse = {
    success: boolean;
    error?: string;
}

const formSchema = z.object({
  opnameDate: z.date(),
  medicineName: z.string().min(2, "Nama obat minimal 2 karakter."),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional(),
  asalBarang: z.string().optional(),
  // Keadaan bulan lalu sekarang opsional, karena akan diisi otomatis
  keadaanBulanLaluBaik: z.coerce.number().min(0).default(0).optional(),
  keadaanBulanLaluRusak: z.coerce.number().min(0).default(0).optional(),
  pemasukanBaik: z.coerce.number().min(0).default(0),
  pemasukanRusak: z.coerce.number().min(0).default(0),
  pengeluaranBaik: z.coerce.number().min(0).default(0),
  pengeluaranRusak: z.coerce.number().min(0).default(0),
  keterangan: z.string().optional(),
});

type StockOpnameData = z.infer<typeof formSchema>;

async function handleStockOpname(formData: StockOpnameData, existingId?: string): Promise<ActionResponse> {
  try {
    const validatedData = formSchema.parse(formData);
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const stockOpnamesRef = db.collection("stock-opnames");

    let keadaanBulanLaluBaik = validatedData.keadaanBulanLaluBaik || 0;
    let keadaanBulanLaluRusak = validatedData.keadaanBulanLaluRusak || 0;

    // --- LOGIKA KALKULASI OTOMATIS ---
    // Cari entri terakhir untuk obat dengan nama yang sama
    const lastEntryQuery = stockOpnamesRef
        .where('medicineName', '==', validatedData.medicineName)
        .orderBy('opnameDate', 'desc')
        .limit(1);
        
    const lastEntrySnapshot = await lastEntryQuery.get();

    if (!lastEntrySnapshot.empty) {
        const lastEntryData = lastEntrySnapshot.docs[0].data();
        // Jika ditemukan, gunakan stok akhir dari entri terakhir sebagai stok awal entri ini
        keadaanBulanLaluBaik = lastEntryData.keadaanBulanLaporanBaik;
        keadaanBulanLaluRusak = lastEntryData.keadaanBulanLaporanRusak;
    }
    // Jika tidak ditemukan (ini entri pertama), gunakan nilai dari form.

    // --- Lakukan Kalkulasi Ulang ---
    const keadaanBulanLaluJml = keadaanBulanLaluBaik + keadaanBulanLaluRusak;
    const pemasukanJml = validatedData.pemasukanBaik + validatedData.pemasukanRusak;
    const pengeluaranJml = validatedData.pengeluaranBaik + validatedData.pengeluaranRusak;
    const keadaanBulanLaporanBaik = keadaanBulanLaluBaik + validatedData.pemasukanBaik - validatedData.pengeluaranBaik;
    const keadaanBulanLaporanRusak = keadaanBulanLaluRusak + validatedData.pemasukanRusak - validatedData.pengeluaranRusak;
    const keadaanBulanLaporanJml = keadaanBulanLaporanBaik + keadaanBulanLaporanRusak;

    const dataToSave = {
      ...validatedData,
      opnameDate: Timestamp.fromDate(validatedData.opnameDate),
      expireDate: validatedData.expireDate ? Timestamp.fromDate(validatedData.expireDate) : null,
      keadaanBulanLaluBaik,
      keadaanBulanLaluRusak,
      keadaanBulanLaluJml,
      pemasukanJml,
      pengeluaranJml,
      keadaanBulanLaporanBaik,
      keadaanBulanLaporanRusak,
      keadaanBulanLaporanJml,
      createdAt: Timestamp.now(),
    };
    
    if (existingId) {
        // Mode UPDATE
        await stockOpnamesRef.doc(existingId).update(dataToSave);
    } else {
        // Mode CREATE
        await stockOpnamesRef.add(dataToSave);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error handling stock opname:", error);
    return { success: false, error: error.message || "Gagal memproses data." };
  }
}

export async function createStockOpnameAction(formData: StockOpnameData): Promise<ActionResponse> {
    return handleStockOpname(formData);
}

export async function updateStockOpnameAction(id: string, formData: StockOpnameData): Promise<ActionResponse> {
    return handleStockOpname(formData, id);
}

export async function deleteStockOpnameAction(id: string): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const db = getFirestore(app);
        await db.collection("stock-opnames").doc(id).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting stock opname:", error);
        return { success: false, error: error.message || "Gagal menghapus data." };
    }
}