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