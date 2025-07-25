"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "./data-table-column-header"
import type { Medicine, User } from "@/lib/types"
import { differenceInDays, format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Timestamp } from "firebase/firestore"

// This type is used to pass handlers from the main page to the columns
export type MedicineActionHandlers = {
  onEdit: (medicine: Medicine) => void;
  onDelete: (medicineId: string) => void;
};


export const getColumns = (handlers: MedicineActionHandlers, userRole?: User['role']): ColumnDef<Medicine>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nama Obat" />
    ),
  },
  {
    accessorKey: "type",
    header: "Jenis Obat",
     filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "unit",
    header: "Satuan",
     filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "sisa_baik",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Sisa Stok" />
    ),
    cell: ({ row }) => {
       const sisa_baik = (row.getValue("sisa_baik") || 0) as number;
       const sisa_rusak = (row.original.sisa_rusak || 0) as number;
       const total = sisa_baik + sisa_rusak;
      return <div className="text-center font-bold">{total || 0}</div>
    },
  },
  {
    accessorKey: "expiryDate",
    header: ({ column }) => (
       <DataTableColumnHeader column={column} title="Tgl. Kadaluarsa" />
    ),
    cell: ({ row }) => {
      const expiry = row.getValue("expiryDate") as Date | Timestamp;
      const expiryDate = expiry instanceof Timestamp ? expiry.toDate() : expiry;
      const daysUntilExpiry = differenceInDays(expiryDate, new Date());

      let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (daysUntilExpiry < 0) {
        badgeVariant = "destructive";
      } else if (daysUntilExpiry <= 30) {
        badgeVariant = "destructive";
      } else if (daysUntilExpiry <= 90) {
        badgeVariant = "outline";
      }

      return (
        <Badge variant={badgeVariant} className={cn(daysUntilExpiry <= 30 && "animate-pulse")}>
          {format(expiryDate, "dd MMM yyyy", { locale: id })}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const medicine = row.original
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handlers.onEdit(medicine)}>Ubah Data</DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem 
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => handlers.onDelete(medicine.id)}
              >
                Hapus Data
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
