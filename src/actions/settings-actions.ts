'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore } from "firebase-admin/firestore";

interface Officials {
    kepalaDinas?: string;
    kepalaBidang?: string;
    // Tambahkan field lain jika perlu, contoh: nipKepalaDinas, dll.
}

interface ActionResponse {
    success: boolean;
    data?: Officials;
    error?: string;
}

export async function getOfficialsAction(): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    // Path disesuaikan dengan struktur Anda: settings -> dinas
    const settingsRef = db.collection("settings").doc("dinas");
    const doc = await settingsRef.get();

    if (!doc.exists) {
        return { success: true, data: {} }; // Kembalikan objek kosong jika belum ada
    }

    return { success: true, data: doc.data() as Officials };
  } catch (error: any) {
    console.error("Error getting officials data:", error);
    return { success: false, error: "Gagal mengambil data pejabat." };
  }
}