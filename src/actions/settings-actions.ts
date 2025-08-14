'use server';
    
import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore } from "firebase-admin/firestore";
import type { User, Officials } from "@/lib/types";
import { z } from "zod";

interface ActionResponse {
    success: boolean;
    data?: Officials;
    error?: string;
}

// Skema untuk validasi data yang disimpan
const officialsSchema = z.object({
    kepalaDinas: z.string().optional(),
    nipKepalaDinas: z.string().optional(),
    kepalaBidang: z.string().optional(),
    nipKepalaBidang: z.string().optional(),
    kepalaUPTD: z.string().optional(),
    nipKepalaUPTD: z.string().optional(),
    // --- KOLOM BARU UNTUK ALAMAT ---
    namaUPTD: z.string().optional(),
    jalan: z.string().optional(),
    desa: z.string().optional(),
    kecamatan: z.string().optional(),
    kabupaten: z.string().optional(),
});

type OfficialsData = z.infer<typeof officialsSchema>;

// Fungsi untuk MENGAMBIL data pejabat dan alamat
export async function getOfficialsAction(user: User): Promise<ActionResponse> {
  try {
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const docId = user.role === 'admin' ? 'dinas' : user.id;

    const settingsRef = db.collection("settings").doc(docId);
    const doc = await settingsRef.get();

    if (!doc.exists) {
        return { success: true, data: {} };
    }

    return { success: true, data: doc.data() as Officials };
  } catch (error: any) {
    console.error("Error getting officials data:", error);
    return { success: false, error: "Gagal mengambil data pejabat." };
  }
}

// Fungsi untuk MENYIMPAN data pejabat dan alamat
export async function updateOfficialsAction(formData: OfficialsData, user: User): Promise<Omit<ActionResponse, 'data'>> {
    try {
        if (!user) {
            throw new Error("User tidak terautentikasi.");
        }

        const validatedData = officialsSchema.parse(formData);
        const app = getFirebaseAdminApp();
        const db = getFirestore(app);

        const docId = user.role === 'admin' ? 'dinas' : user.id;

        const settingsRef = db.collection("settings").doc(docId);
        await settingsRef.set(validatedData, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating officials data:", error);
        return { success: false, error: "Gagal menyimpan data pengaturan." };
    }
}
