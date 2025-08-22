'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, doc, updateDoc } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

// --- IMPORTS BARU UNTUK FUNGSI UBAH PASSWORD ---
import { getAuth as getClientAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth as clientAuth } from "@/lib/firebase"; // Menggunakan firebase client untuk auth

type ActionResponse = {
    success: boolean;
    error?: string;
    deletedCount?: number;
}

// --- FUNGSI ASLI ANDA (TETAP ADA) ---
export async function createUserAction(formData: any): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const { email, password, name, nip, role, location } = formData;
    const userRecord = await auth.createUser({ email, password, displayName: name });
    await auth.setCustomUserClaims(userRecord.uid, { role });
    await db.collection("users").doc(userRecord.uid).set({ name, nip, email, role, location });
    return { success: true };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message || "Gagal membuat pengguna." };
  }
}

export async function updateUserAction(uid: string, formData: any): Promise<ActionResponse> {
   try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const { name, nip, role, location, password } = formData;
    const updatePayload: any = { displayName: name };
    if (password) {
        updatePayload.password = password;
    }
    await auth.updateUser(uid, updatePayload);
    await auth.setCustomUserClaims(uid, { role });
    await db.collection("users").doc(uid).update({ name, nip, role, location });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message || "Gagal memperbarui pengguna." };
  }
}

export async function deleteUserAction(uid: string): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const auth = getAuth(app);
        const db = getFirestore(app);
        const stockOpnamesRef = db.collection("stock-opnames");
        const q = stockOpnamesRef.where("userId", "==", uid);
        const snapshot = await q.get();
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        await auth.deleteUser(uid);
        await db.collection("users").doc(uid).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user and their data:", error);
        return { success: false, error: error.message || "Gagal menghapus pengguna dan data terkait." };
    }
}

// --- FUNGSI PENGATURAN AKUN UPTD (DIPERBAIKI) ---

interface ProfileData {
  name: string;
  nip?: string;
}

/**
 * Memperbarui nama dan NIP pengguna di Firestore dan Firebase Auth.
 * @param userId - ID pengguna yang akan diperbarui.
 * @param data - Data baru (nama, nip).
 */
export async function updateUserProfileAction(userId: string, data: ProfileData): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 1. Update di Firestore
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      name: data.name,
      nip: data.nip || "",
    });

    // 2. Update di Firebase Authentication
    await auth.updateUser(userId, {
        displayName: data.name,
    });

    revalidatePath("/pengaturan");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal update profil:", error);
    return { success: false, error: "Gagal memperbarui profil pengguna." };
  }
}

/**
 * Mengubah password pengguna saat ini.
 * Memerlukan re-autentikasi, sehingga harus menggunakan Firebase Client SDK.
 * @param currentPassword - Password lama pengguna.
 * @param newPassword - Password baru pengguna.
 */
export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<ActionResponse> {
  try {
    // Gunakan auth dari sisi client karena kita butuh session pengguna saat ini
    const auth = clientAuth;
    const user = auth.currentUser;

    if (!user || !user.email) {
      throw new Error("Pengguna tidak ditemukan. Silakan login ulang.");
    }

    // 1. Buat kredensial menggunakan email dan password lama
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    // 2. Lakukan re-autentikasi
    await reauthenticateWithCredential(user, credential);

    // 3. Jika re-autentikasi berhasil, ubah password
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error: any) {
    console.error("Gagal mengubah password:", error);
    // Berikan pesan error yang lebih spesifik dan mudah dimengerti
    if (error.code === 'auth/wrong-password') {
        return { success: false, error: "Password saat ini yang Anda masukkan salah." };
    }
    if (error.code === 'auth/requires-recent-login') {
        return { success: false, error: "Sesi Anda telah berakhir. Silakan logout dan login kembali untuk mengubah password." };
    }
    return { success: false, error: "Terjadi kesalahan saat mengubah password." };
  }
}

// --- FUNGSI CLEANUP (TETAP ADA) ---
export async function cleanupOrphanedStockDataAction(): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const auth = getAuth(app);
        const db = getFirestore(app);
        const stockOpnamesRef = db.collection("stock-opnames");
        const allStockSnapshot = await stockOpnamesRef.get();
        if (allStockSnapshot.empty) {
            return { success: true, deletedCount: 0 };
        }
        const batch = db.batch();
        let deletedCount = 0;
        for (const doc of allStockSnapshot.docs) {
            const data = doc.data();
            const userId = data.userId;
            if (!userId) continue;
            try {
                await auth.getUser(userId);
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    batch.delete(doc.ref);
                    deletedCount++;
                }
            }
        }
        if (deletedCount > 0) {
            await batch.commit();
        }
        return { success: true, deletedCount };
    } catch (error: any) {
        console.error("Error cleaning up orphaned stock data:", error);
        return { success: false, error: "Gagal membersihkan data stok." };
    }
}
