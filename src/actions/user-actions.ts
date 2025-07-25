'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type ActionResponse = {
    success: boolean;
    error?: string;
}

export async function createUserAction(formData: any): Promise<ActionResponse> {
  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const { email, password, name, nip, role, location } = formData;

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    
    await auth.setCustomUserClaims(userRecord.uid, { role });

    await db.collection("users").doc(userRecord.uid).set({
      name,
      nip,
      email,
      role,
      location,
    });

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

    const updatePayload: any = {
        displayName: name,
    };

    if (password) {
        updatePayload.password = password;
    }

    await auth.updateUser(uid, updatePayload);
    await auth.setCustomUserClaims(uid, { role });

    await db.collection("users").doc(uid).update({
      name,
      nip,
      role,
      location,
    });

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

        await auth.deleteUser(uid);
        await db.collection("users").doc(uid).delete();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message || "Gagal menghapus pengguna." };
    }
}
