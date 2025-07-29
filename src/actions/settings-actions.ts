'use server';
    
import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore } from "firebase-admin/firestore";
import type { User } from "@/lib/types";

// Tipe data sekarang mencakup pejabat UPTD
interface Officials {
    kepalaDinas?: string;
    nipKepalaDinas?: string;
    kepalaBidang?: string;
    nipKepalaBidang?: string;
    kepalaUPTD?: string;
    nipKepalaUPTD?: string;
}

interface ActionResponse {
    success: boolean;
    data?: Officials;
    error?: string;
}

// Fungsi sekarang menerima objek 'user'
export async function getOfficialsAction(user: User): Promise<ActionResponse> {
  try {
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    // --- PERUBAHAN LOGIKA DIMULAI DI SINI ---
    // Tentukan dokumen mana yang akan dibaca berdasarkan peran pengguna
    const docId = user.role === 'admin' ? 'dinas' : 'uptd';
    // --- PERUBAHAN LOGIKA SELESAI DI SINI ---

    const settingsRef = db.collection("settings").doc(docId);
    const doc = await settingsRef.get();

    if (!doc.exists) {
        // Jika dokumen 'uptd' belum ada, kembalikan objek kosong
        return { success: true, data: {} };
    }

    return { success: true, data: doc.data() as Officials };
  } catch (error: any) {
    console.error("Error getting officials data:", error);
    return { success: false, error: "Gagal mengambil data pejabat." };
  }
}