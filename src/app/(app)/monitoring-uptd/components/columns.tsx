"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import type { MonitoringData } from "@/lib/types"

export const columns: ColumnDef<MonitoringData>[] = [
  {
    accessorKey: "location",
    header: "Lokasi UPTD",
  },
  {
    accessorKey: "medicineName",
    header: "Nama Obat",
  },
  {
    accessorKey: "jenisObat",
    header: "Jenis Obat",
  },
  {
    accessorKey: "satuan",
    header: "Satuan",
  },
  {
    accessorKey: "sisaStok",
    header: "Sisa Stok",
    cell: ({ row }) => <div className="text-center font-bold">{row.getValue("sisaStok")}</div>,
  },
  {
    accessorKey: "expireDate",
    header: "Tgl. Kadaluarsa",
    cell: ({ row }) => {
      const date = row.getValue("expireDate") as Date | null;
      if (date instanceof Date && !isNaN(date.getTime())) {
        const isExpired = new Date() > date;
        return (
          <div className="text-center">
            <Badge variant={isExpired ? "destructive" : "outline"}>
              {format(date, "d LLL yyyy", { locale: id })}
            </Badge>
          </div>
        );
      }
      return <div className="text-center">-</div>;
    },
  },
  {
    accessorKey: "keterangan",
    header: "Keterangan",
  },
]