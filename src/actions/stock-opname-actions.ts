'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp, Query } from "firebase-admin/firestore";
import { z } from "zod";
import type { User } from "@/lib/types";

type ActionResponse = {
    success: boolean;
    error?: string;
}

const formSchema = z.object({
  opnameDate: z.date(),
  medicineName: z.string().min(2, "Nama obat minimal 2 karakter."),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional(),
  asalBarang: z.string().optional(),
  keadaanBulanLaluBaik: z.coerce.number().min(0).default(0),
  keadaanBulanLaluRusak: z.coerce.number().min(0).default(0),
  pemasukanBaik: z.coerce.number().min(0).default(0),
  pemasukanRusak: z.coerce.number().min(0).default(0),
  pengeluaranBaik: z.coerce.number().min(0).default(0),
  pengeluaranRusak: z.coerce.number().min(0).default(0),
  keterangan: z.string().optional(),
});

type StockOpnameData = z.infer<typeof formSchema>;

async function handleStockOpname(formData: StockOpnameData, user: User, existingId?: string): Promise<ActionResponse> {
  try {
    const validatedData = formSchema.parse(formData);
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const stockOpnamesRef = db.collection("stock-opnames");

    const keadaanBulanLaluBaik = validatedData.keadaanBulanLaluBaik;
    const keadaanBulanLaluRusak = validatedData.keadaanBulanLaluRusak;
    
    const keadaanBulanLaluJml = keadaanBulanLaluBaik + keadaanBulanLaluRusak;
    const pemasukanJml = validatedData.pemasukanBaik + validatedData.pemasukanRusak;
    const pengeluaranJml = validatedData.pengeluaranBaik + validatedData.pengeluaranRusak;
    const keadaanBulanLaporanBaik = keadaanBulanLaluBaik + validatedData.pemasukanBaik - validatedData.pengeluaranBaik;
    const keadaanBulanLaporanRusak = keadaanBulanLaluRusak + validatedData.pemasukanRusak - validatedData.pengeluaranRusak;
    const keadaanBulanLaporanJml = keadaanBulanLaporanBaik + keadaanBulanLaporanRusak;

    const dataToSave = {
      ...validatedData,
      opnameDate: Timestamp.fromDate(validatedData.opnameDate),
      expireDate: validatedData.expireDate ? Timestamp.fromDate(validatedData.expireDate) : null,
      keadaanBulanLaluBaik,
      keadaanBulanLaluRusak,
      keadaanBulanLaluJml,
      pemasukanJml,
      pengeluaranJml,
      keadaanBulanLaporanBaik,
      keadaanBulanLaporanRusak,
      keadaanBulanLaporanJml,
      createdAt: Timestamp.now(),
      userId: user.id,
      userLocation: user.location,
      userName: user.name,
      userRole: user.role,
    };
    
    if (existingId) {
        await stockOpnamesRef.doc(existingId).update(dataToSave);
    } else {
        await stockOpnamesRef.add(dataToSave);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error handling stock opname:", error);
    return { success: false, error: error.message || "Gagal memproses data." };
  }
}

export async function createStockOpnameAction(formData: StockOpnameData, user: User): Promise<ActionResponse> {
    return handleStockOpname(formData, user);
}

export async function updateStockOpnameAction(id: string, formData: StockOpnameData, user: User): Promise<ActionResponse> {
    return handleStockOpname(formData, user, id);
}

export async function deleteStockOpnameAction(id: string): Promise<ActionResponse> {
    try {
        const app = getFirebaseAdminApp();
        const db = getFirestore(app);
        await db.collection("stock-opnames").doc(id).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting stock opname:", error);
        return { success: false, error: error.message || "Gagal menghapus data." };
    }
}

interface GetLastStockResponse {
    success: boolean;
    data?: {
        keadaanBulanLaporanBaik: number;
        keadaanBulanLaporanRusak: number;
    };
    error?: string;
}

// --- FUNGSI YANG DIPERBARUI ---
export async function getLastStockAction(
    medicineName: string, 
    expireDate: Date, 
    user: User,
    currentDocId?: string | null
): Promise<GetLastStockResponse> {
    try {
        if (!user) throw new Error("User tidak terautentikasi.");

        const app = getFirebaseAdminApp();
        const db = getFirestore(app);
        const stockOpnamesRef = db.collection("stock-opnames");

        // 1. Query disederhanakan: hanya mencari berdasarkan nama obat
        let q: Query = stockOpnamesRef.where('medicineName', '==', medicineName);

        if (user.role !== 'admin') {
            q = q.where('userId', '==', user.id);
        } else {
            q = q.where('userRole', '==', 'admin');
        }

        const querySnapshot = await q.get();
        
        // 2. Filter berdasarkan tanggal kadaluarsa dilakukan di sini (dalam kode)
        const matchingDocs = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(data => {
                const docExpireDate = data.expireDate?.toDate();
                return docExpireDate?.getTime() === expireDate.getTime();
            });

        const docsToConsider = currentDocId 
            ? matchingDocs.filter(doc => doc.id !== currentDocId)
            : matchingDocs;

        // 3. Urutkan data di sini
        docsToConsider.sort((a, b) => b.opnameDate.toDate().getTime() - a.opnameDate.toDate().getTime());

        if (docsToConsider.length > 0) {
            const lastRecord = docsToConsider[0];
            return {
                success: true,
                data: {
                    keadaanBulanLaporanBaik: lastRecord.keadaanBulanLaporanBaik || 0,
                    keadaanBulanLaporanRusak: lastRecord.keadaanBulanLaporanRusak || 0,
                }
            };
        } else {
            return {
                success: true,
                data: { keadaanBulanLaporanBaik: 0, keadaanBulanLaporanRusak: 0 }
            };
        }
    } catch (error: any) {
        console.error("Error di getLastStockAction:", error);
        return { success: false, error: "Gagal mengambil data stok terakhir." };
    }
}
