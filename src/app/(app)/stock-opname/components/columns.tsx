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
import { cn } from "@/lib/utils"

// --- PERBAIKAN 1: Tambahkan onContinue ke dalam interface ---
export interface StockOpnameActionHandlers {
  onEdit: (opname: StockOpname) => void;
  onDelete: (opname: StockOpname) => void;
  onContinue: (opname: StockOpname) => void; // <-- Fungsi baru
}

export const getColumns = (handlers: StockOpnameActionHandlers): ColumnDef<StockOpname>[] => [
  {
    accessorKey: "medicineName",
    header: () => <div className="text-left">Nama Obat</div>,
    cell: ({ row }) => <div className="text-left font-medium">{row.original.medicineName}</div>,
  },
  {
      id: 'keadaanBulanLaluGroup',
      header: () => <div className="text-center">Keadaan Bulan Lalu</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "keadaanBulanLaluBaik", cell: ({ row }) => <div className="text-center">{row.original.keadaanBulanLaluBaik}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "keadaanBulanLaluRusak", cell: ({ row }) => <div className="text-center">{row.original.keadaanBulanLaluRusak}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "keadaanBulanLaluJml", cell: ({ row }) => <div className="text-center font-bold">{row.original.keadaanBulanLaluJml}</div> },
      ],
  },
  {
      id: 'pemasukanGroup',
      header: () => <div className="text-center">Pemasukan</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "pemasukanBaik", cell: ({ row }) => <div className="text-center">{row.original.pemasukanBaik}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "pemasukanRusak", cell: ({ row }) => <div className="text-center">{row.original.pemasukanRusak}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "pemasukanJml", cell: ({ row }) => <div className="text-center font-bold">{row.original.pemasukanJml}</div> },
      ],
  },
  {
      id: 'pengeluaranGroup',
      header: () => <div className="text-center">Pengeluaran</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "pengeluaranBaik", cell: ({ row }) => <div className="text-center">{row.original.pengeluaranBaik}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "pengeluaranRusak", cell: ({ row }) => <div className="text-center">{row.original.pengeluaranRusak}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "pengeluaranJml", cell: ({ row }) => <div className="text-center font-bold">{row.original.pengeluaranJml}</div> },
      ],
  },
  {
      id: 'keadaanBulanLaporanGroup',
      header: () => <div className="text-center">Keadaan Bulan Laporan</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "keadaanBulanLaporanBaik", cell: ({ row }) => <div className="text-center">{row.original.keadaanBulanLaporanBaik}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "keadaanBulanLaporanRusak", cell: ({ row }) => <div className="text-center">{row.original.keadaanBulanLaporanRusak}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "keadaanBulanLaporanJml", cell: ({ row }) => <div className="text-center font-bold">{row.original.keadaanBulanLaporanJml}</div> },
      ],
  },
  {
    id: 'expireDateGroup',
    header: "Expire Date",
    accessorKey: "expireDate",
    cell: ({ row }) => {
        const date = row.original.expireDate;
        if (date instanceof Date && !isNaN(date.getTime())) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setMonth(thirtyDaysFromNow.getMonth() + 1);
            const isExpiringSoon = date < thirtyDaysFromNow;
            return (
                <div className={cn("text-center", isExpiringSoon && "text-red-500 font-bold")}>
                    {format(date, "d LLL yyyy", { locale: id })}
                </div>
            );
        }
        return <div className="text-center">-</div>;
    }
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
            {/* --- PERBAIKAN 2: Tambahkan tombol "Lanjutkan Pencatatan" --- */}
            <DropdownMenuItem onClick={() => handlers.onContinue(opname)}>
              Lanjutkan Pencatatan
            </DropdownMenuItem>
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
