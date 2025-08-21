'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, doc, updateDoc } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

import { getAuth as getClientAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth as clientAuth } from "@/lib/firebase";

type ActionResponse = {
    success: boolean;
    error?: string;
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

// --- FUNGSI DELETE USER YANG DIPERBAIKI ---
export async function deleteUserAction(uid: string): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const auth = getAuth(app);
        const db = getFirestore(app);

        // --- PERBAIKAN: Hapus data stock opname terkait ---
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
        // --- AKHIR PERBAIKAN ---

        // Lanjutkan menghapus pengguna dari Auth dan koleksi 'users'
        await auth.deleteUser(uid);
        await db.collection("users").doc(uid).delete();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user and their data:", error);
        return { success: false, error: error.message || "Gagal menghapus pengguna dan data terkait." };
    }
}

// --- FUNGSI PENGATURAN AKUN UPTD (TETAP ADA) ---
interface ProfileData {
  name: string;
  nip?: string;
}

export async function updateUserProfileAction(userId: string, data: ProfileData): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { name: data.name, nip: data.nip || "" });
    await auth.updateUser(userId, { displayName: data.name });
    revalidatePath("/pengaturan");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal update profil:", error);
    return { success: false, error: "Gagal memperbarui profil pengguna." };
  }
}

export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<ActionResponse> {
  try {
    const auth = clientAuth;
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("Pengguna tidak ditemukan. Silakan login ulang.");
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error: any) {
    console.error("Gagal mengubah password:", error);
    if (error.code === 'auth/wrong-password') {
        return { success: false, error: "Password saat ini yang Anda masukkan salah." };
    }
    return { success: false, error: "Terjadi kesalahan saat mengubah password." };
  }
}
