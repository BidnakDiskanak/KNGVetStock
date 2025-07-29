'use server';
    
import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore } from "firebase-admin/firestore";
import type { User, Officials } from "@/lib/types";

interface ActionResponse {
    success: boolean;
    data?: Officials;
    error?: string;
}

export async function getOfficialsAction(user: User): Promise<ActionResponse> {
  try {
    if (!user) {
        throw new Error("User tidak terautentikasi.");
    }

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const docId = user.role === 'admin' ? 'dinas' : 'uptd';

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