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
    id: 'medicineNameGroup',
    header: () => <div className="text-left">Nama Obat</div>,
    accessorKey: "medicineName",
    cell: ({ row }) => <div className="text-left font-medium">{row.getValue("medicineName")}</div>,
  },
  {
      id: 'keadaanBulanLaluGroup',
      header: () => <div className="text-center">Keadaan Bulan Lalu</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "keadaanBulanLaluBaik", cell: ({ row }) => <div className="text-center">{row.getValue("keadaanBulanLaluBaik")}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "keadaanBulanLaluRusak", cell: ({ row }) => <div className="text-center">{row.getValue("keadaanBulanLaluRusak")}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "keadaanBulanLaluJml", cell: ({ row }) => <div className="text-center font-bold">{row.getValue("keadaanBulanLaluJml")}</div> },
      ],
  },
  {
      id: 'pemasukanGroup',
      header: () => <div className="text-center">Pemasukan</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "pemasukanBaik", cell: ({ row }) => <div className="text-center">{row.getValue("pemasukanBaik")}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "pemasukanRusak", cell: ({ row }) => <div className="text-center">{row.getValue("pemasukanRusak")}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "pemasukanJml", cell: ({ row }) => <div className="text-center font-bold">{row.getValue("pemasukanJml")}</div> },
      ],
  },
  {
      id: 'pengeluaranGroup',
      header: () => <div className="text-center">Pengeluaran</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "pengeluaranBaik", cell: ({ row }) => <div className="text-center">{row.getValue("pengeluaranBaik")}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "pengeluaranRusak", cell: ({ row }) => <div className="text-center">{row.getValue("pengeluaranRusak")}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "pengeluaranJml", cell: ({ row }) => <div className="text-center font-bold">{row.getValue("pengeluaranJml")}</div> },
      ],
  },
  {
      id: 'keadaanBulanLaporanGroup',
      header: () => <div className="text-center">Keadaan Bulan Laporan</div>,
      columns: [
          { header: () => <div className="text-center">Baik</div>, accessorKey: "keadaanBulanLaporanBaik", cell: ({ row }) => <div className="text-center">{row.getValue("keadaanBulanLaporanBaik")}</div> },
          { header: () => <div className="text-center">Rusak</div>, accessorKey: "keadaanBulanLaporanRusak", cell: ({ row }) => <div className="text-center">{row.getValue("keadaanBulanLaporanRusak")}</div> },
          { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "keadaanBulanLaporanJml", cell: ({ row }) => <div className="text-center font-bold">{row.getValue("keadaanBulanLaporanJml")}</div> },
      ],
  },
  {
    id: 'opnameDateGroup',
    header: "Tanggal Catat",
    accessorKey: "opnameDate",
    cell: ({ row }) => {
        const date = row.getValue("opnameDate");
        // --- PERBAIKAN DI SINI ---
        if (date instanceof Date && !isNaN(date.getTime())) {
            return <div className="text-center">{format(date, "d LLL yyyy", { locale: id })}</div>
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