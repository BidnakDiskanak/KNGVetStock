'use server';

import { getFirebaseAdminApp } from "@/lib/firebase-admin-app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

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

// Fungsi untuk membuat data baru (CREATE)
export async function createStockOpnameAction(formData: StockOpnameData): Promise<ActionResponse> {
  try {
    const validatedData = formSchema.parse(formData);
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const keadaanBulanLaluJml = validatedData.keadaanBulanLaluBaik + validatedData.keadaanBulanLaluRusak;
    const pemasukanJml = validatedData.pemasukanBaik + validatedData.pemasukanRusak;
    const pengeluaranJml = validatedData.pengeluaranBaik + validatedData.pengeluaranRusak;
    const keadaanBulanLaporanBaik = validatedData.keadaanBulanLaluBaik + validatedData.pemasukanBaik - validatedData.pengeluaranBaik;
    const keadaanBulanLaporanRusak = validatedData.keadaanBulanLaluRusak + validatedData.pemasukanRusak - validatedData.pengeluaranRusak;
    const keadaanBulanLaporanJml = keadaanBulanLaporanBaik + keadaanBulanLaporanRusak;

    const dataToSave = {
      ...validatedData,
      opnameDate: Timestamp.fromDate(validatedData.opnameDate),
      expireDate: validatedData.expireDate ? Timestamp.fromDate(validatedData.expireDate) : null,
      keadaanBulanLaluJml,
      pemasukanJml,
      pengeluaranJml,
      keadaanBulanLaporanBaik,
      keadaanBulanLaporanRusak,
      keadaanBulanLaporanJml,
      createdAt: Timestamp.now(),
    };

    await db.collection("stock-opnames").add(dataToSave);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating stock opname:", error);
    return { success: false, error: error.message || "Gagal menyimpan data." };
  }
}

// Fungsi untuk mengubah data (UPDATE)
export async function updateStockOpnameAction(id: string, formData: StockOpnameData): Promise<ActionResponse> {
  try {
    const validatedData = formSchema.parse(formData);
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    const keadaanBulanLaluJml = validatedData.keadaanBulanLaluBaik + validatedData.keadaanBulanLaluRusak;
    const pemasukanJml = validatedData.pemasukanBaik + validatedData.pemasukanRusak;
    const pengeluaranJml = validatedData.pengeluaranBaik + validatedData.pengeluaranRusak;
    const keadaanBulanLaporanBaik = validatedData.keadaanBulanLaluBaik + validatedData.pemasukanBaik - validatedData.pengeluaranBaik;
    const keadaanBulanLaporanRusak = validatedData.keadaanBulanLaluRusak + validatedData.pemasukanRusak - validatedData.pengeluaranRusak;
    const keadaanBulanLaporanJml = keadaanBulanLaporanBaik + keadaanBulanLaporanRusak;

    const dataToUpdate = {
      ...validatedData,
      opnameDate: Timestamp.fromDate(validatedData.opnameDate),
      expireDate: validatedData.expireDate ? Timestamp.fromDate(validatedData.expireDate) : null,
      keadaanBulanLaluJml,
      pemasukanJml,
      pengeluaranJml,
      keadaanBulanLaporanBaik,
      keadaanBulanLaporanRusak,
      keadaanBulanLaporanJml,
    };

    await db.collection("stock-opnames").doc(id).update(dataToUpdate);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating stock opname:", error);
    return { success: false, error: error.message || "Gagal memperbarui data." };
  }
}

// Fungsi untuk menghapus data (DELETE)
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
```typescript
/*
================================================================================
File 3: Definisi Kolom Tabel Stock Opname
Lokasi: src/app/(app)/stock-opname/components/columns.tsx
Tujuan: Buat file BARU ini untuk mendefinisikan kolom-kolom tabel.
================================================================================
*/
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StockOpname } from "@/lib/types"

export interface StockOpnameActionHandlers {
  onEdit: (opname: StockOpname) => void;
  onDelete: (opname: StockOpname) => void;
}

export const getColumns = (handlers: StockOpnameActionHandlers): ColumnDef<StockOpname>[] => [
  {
    accessorKey: "medicineName",
    header: "Nama Obat",
  },
  {
    accessorKey: "keadaanBulanLaporanJml",
    header: "Stok Akhir",
  },
  {
    accessorKey: "opnameDate",
    header: "Tanggal Catat",
    cell: ({ row }) => {
        const date = row.getValue("opnameDate") as Date;
        return <span>{format(date, "d LLL yyyy", { locale: id })}</span>
    }
  },
  {
    accessorKey: "keterangan",
    header: "Keterangan",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const opname = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Buka menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handlers.onEdit(opname)}>
              Ubah Data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => handlers.onDelete(opname)}
            >
              Hapus Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]