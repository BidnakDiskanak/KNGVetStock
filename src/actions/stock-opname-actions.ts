'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

type ActionResponse = {
    success: boolean;
    error?: string;
}

// Definisikan skema data yang diterima dari formulir
const formSchema = z.object({
  opnameDate: z.date(),
  medicineName: z.string(),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional(),
  asalBarang: z.string().optional(),
  keadaanBulanLaluBaik: z.number(),
  keadaanBulanLaluRusak: z.number(),
  pemasukanBaik: z.number(),
  pemasukanRusak: z.number(),
  pengeluaranBaik: z.number(),
  pengeluaranRusak: z.number(),
  keterangan: z.string().optional(),
});

type StockOpnameData = z.infer<typeof formSchema>;

export async function createStockOpnameAction(formData: StockOpnameData): Promise<ActionResponse> {
  try {
    // Validasi data di server untuk keamanan
    const validatedData = formSchema.parse(formData);

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    // --- Lakukan Kalkulasi Otomatis ---
    const keadaanBulanLaluJml = validatedData.keadaanBulanLaluBaik + validatedData.keadaanBulanLaluRusak;
    const pemasukanJml = validatedData.pemasukanBaik + validatedData.pemasukanRusak;
    const pengeluaranJml = validatedData.pengeluaranBaik + validatedData.pengeluaranRusak;

    const keadaanBulanLaporanBaik = validatedData.keadaanBulanLaluBaik + validatedData.pemasukanBaik - validatedData.pengeluaranBaik;
    const keadaanBulanLaporanRusak = validatedData.keadaanBulanLaluRusak + validatedData.pemasukanRusak - validatedData.pengeluaranRusak;
    const keadaanBulanLaporanJml = keadaanBulanLaporanBaik + keadaanBulanLaporanRusak;

    // Data lengkap yang akan disimpan ke Firestore
    const dataToSave = {
      ...validatedData,
      opnameDate: Timestamp.fromDate(validatedData.opnameDate),
      expireDate: validatedData.expireDate ? Timestamp.fromDate(validatedData.expireDate) : null,
      
      // Hasil kalkulasi
      keadaanBulanLaluJml,
      pemasukanJml,
      pengeluaranJml,
      keadaanBulanLaporanBaik,
      keadaanBulanLaporanRusak,
      keadaanBulanLaporanJml,

      createdAt: Timestamp.now(),
    };

    await db.collection("stock-opnames").add(dataToSave);

    return { success: true };
  } catch (error: any) {
    console.error("Error creating stock opname:", error);
    if (error instanceof z.ZodError) {
        return { success: false, error: "Data yang dikirim tidak valid." };
    }
    return { success: false, error: error.message || "Gagal menyimpan data stock opname." };
  }
}