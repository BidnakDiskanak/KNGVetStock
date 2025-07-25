"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/app/(app)/stock-opname/components/data-table-column-header"
import type { Medicine } from "@/lib/types"
import { differenceInDays, format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Timestamp } from "firebase/firestore"

// Read-only columns for monitoring page
export const getMonitoringColumns = (): ColumnDef<Medicine>[] => [
  {
    accessorKey: "locationName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lokasi UPTD" />,
     cell: ({ row }) => {
        const locationName = row.getValue("locationName") as string;
        return <Badge variant='secondary' className="capitalize">{locationName || 'N/A'}</Badge>
    },
     filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string | undefined;

        if (!rowValue) {
            return false;
        }
        
        return value.includes(rowValue);
    },
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
  },
  {
    accessorKey: "unit",
    header: "Satuan",
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
    accessorKey: "notes",
    header: "Keterangan",
  }
]
