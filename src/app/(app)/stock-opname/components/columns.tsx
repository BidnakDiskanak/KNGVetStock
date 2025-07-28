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
    header: "Nama Obat",
    accessorKey: "medicineName",
  },
  {
      header: "Keadaan Bulan Lalu",
      columns: [
          { header: "Baik", accessorKey: "keadaanBulanLaluBaik" },
          { header: "Rusak", accessorKey: "keadaanBulanLaluRusak" },
          { header: "Jml", accessorKey: "keadaanBulanLaluJml" },
      ],
  },
  {
      header: "Pemasukan",
      columns: [
          { header: "Baik", accessorKey: "pemasukanBaik" },
          { header: "Rusak", accessorKey: "pemasukanRusak" },
          { header: "Jml", accessorKey: "pemasukanJml" },
      ],
  },
  {
      header: "Pengeluaran",
      columns: [
          { header: "Baik", accessorKey: "pengeluaranBaik" },
          { header: "Rusak", accessorKey: "pengeluaranRusak" },
          { header: "Jml", accessorKey: "pengeluaranJml" },
      ],
  },
  {
      header: "Keadaan Bulan Laporan",
      columns: [
          { header: "Baik", accessorKey: "keadaanBulanLaporanBaik" },
          { header: "Rusak", accessorKey: "keadaanBulanLaporanRusak" },
          { header: "Jml", accessorKey: "keadaanBulanLaporanJml" },
      ],
  },
  {
    header: "Tanggal Catat",
    accessorKey: "opnameDate",
    cell: ({ row }) => {
        const date = row.getValue("opnameDate") as Date;
        return <span>{format(date, "d LLL yyyy", { locale: id })}</span>
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