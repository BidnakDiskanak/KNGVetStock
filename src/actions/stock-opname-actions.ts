'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
    success: boolean;
    error?: string;
}

interface StockOpnameData {
    medicineName: string;
    quantity: number;
    opnameDate: Date;
}

export async function createStockOpnameAction(formData: StockOpnameData): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const { medicineName, quantity, opnameDate } = formData;

    // Data yang akan disimpan ke Firestore
    const dataToSave = {
        medicineName,
        quantity,
        // Ubah objek Date dari JavaScript menjadi Timestamp Firestore
        opnameDate: Timestamp.fromDate(opnameDate), 
        createdAt: Timestamp.now(), // Tambahkan tanggal pembuatan record
    };

    // Buat dokumen baru di koleksi 'stock-opnames'
    // Firestore akan otomatis membuat ID unik untuk dokumen ini
    await db.collection("stock-opnames").add(dataToSave);

    return { success: true };
  } catch (error: any) {
    console.error("Error creating stock opname:", error);
    return { success: false, error: error.message || "Gagal menyimpan data stock opname." };
  }
}