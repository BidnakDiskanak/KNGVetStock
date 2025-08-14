"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StockOpname } from '@/lib/types';
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useUser } from '@/contexts/UserProvider';
import { useToast } from '@/hooks/use-toast';

// --- IMPORTS BARU UNTUK DATA TABLE ---
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown } from 'lucide-react';
// --- AKHIR IMPORTS BARU ---


// --- KOMPONEN COLUMNS DIBUAT DI SINI ---
export const getLaporanColumns = (): ColumnDef<StockOpname>[] => [
    {
      accessorKey: "medicineName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nama Obat
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="pl-4">{row.getValue("medicineName")}</div>,
    },
    {
      accessorKey: "stockSystem",
      header: () => <div className="text-center">Stok Sistem</div>,
      cell: ({ row }) => <div className="text-center">{row.getValue("stockSystem")}</div>,
    },
    {
      accessorKey: "stockReal",
      header: () => <div className="text-center">Stok Fisik</div>,
      cell: ({ row }) => <div className="text-center">{row.getValue("stockReal")}</div>,
    },
    {
      accessorKey: "difference",
      header: () => <div className="text-center">Selisih</div>,
      cell: ({ row }) => {
        const difference = row.getValue("difference") as number;
        const color = difference < 0 ? "text-red-500" : "text-green-500";
        return <div className={`text-center font-medium ${color}`}>{difference}</div>
      },
    },
    {
      accessorKey: "unit",
      header: "Satuan",
    },
    {
      accessorKey: "opnameDate",
      header: "Tgl Opname",
      cell: ({ row }) => {
        const date = row.getValue("opnameDate") as Date;
        return <span>{format(date, "d MMM yyyy", { locale: id })}</span>;
      },
    },
    {
      accessorKey: "expireDate",
      header: "Tgl Kedaluwarsa",
      cell: ({ row }) => {
        const date = row.getValue("expireDate") as Date | undefined;
        return date ? <span>{format(date, "d MMM yyyy", { locale: id })}</span> : <span className="text-muted-foreground">-</span>;
      },
    }
];

// --- KOMPONEN DATA TABLE DIBUAT DI SINI ---
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn: string;
}

function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder={`Cari nama obat...`}
          value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(filterColumn)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}


// --- KOMPONEN UTAMA LAPORAN PAGE ---
export default function LaporanPage() {
  const [laporanData, setLaporanData] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    const q = query(collection(db, "stock-opnames"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const opnamesData: StockOpname[] = [];
      querySnapshot.forEach(doc => {
          const data = doc.data();
          const opnameDate = data.opnameDate?.toDate();
          const expireDate = data.expireDate?.toDate();

          if (!opnameDate || isNaN(opnameDate.getTime())) {
              console.warn(`Melewati dokumen ${doc.id} karena opnameDate tidak valid.`);
              return;
          }

          opnamesData.push({
              id: doc.id,
              ...data,
              opnameDate: opnameDate,
              expireDate: expireDate && !isNaN(expireDate.getTime()) ? expireDate : undefined,
          } as StockOpname);
      });

      const recordsByBatch: { [key: string]: StockOpname[] } = {};
      for (const record of opnamesData) {
          const expireDateString = record.expireDate ? record.expireDate.toISOString() : 'no-expiry';
          const key = `${record.medicineName}|${expireDateString}`;
          if (!recordsByBatch[key]) {
              recordsByBatch[key] = [];
          }
          recordsByBatch[key].push(record);
      }

      const latestRecords = Object.values(recordsByBatch).map(records => {
          return records.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime())[0];
      });
      
      latestRecords.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime());

      setLaporanData(latestRecords);
      setLoading(false);
    }, (error) => {
        console.error("Gagal mengambil data laporan:", error);
        setLoading(false);
        toast({
            title: "Gagal Memuat Laporan",
            description: "Tidak dapat mengambil data untuk laporan. Coba lagi nanti.",
            variant: "destructive",
        })
    });

    return () => unsubscribe();
    
  }, [user, toast]);
  
  const columns = useMemo(() => getLaporanColumns(), []);

  if (loading) {
      return (
        <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      )
  }

  return (
    <>
      <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Laporan Stok Opname</h2>
                <p className="text-muted-foreground">
                    Berikut adalah daftar stok opname terbaru untuk setiap batch obat.
                </p>
            </div>
        </div>
        <DataTable data={laporanData} columns={columns} filterColumn="medicineName"/>
      </div>
    </>
  );
}
