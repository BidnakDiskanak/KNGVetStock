"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StockOpname, Officials, User } from '@/lib/types';
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useUser } from '@/contexts/UserProvider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getOfficialsAction } from "@/actions/settings-actions";

// --- UI Components ---
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
// --- PERBAIKAN DI SINI ---
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Calendar as CalendarIcon, Printer } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// --- Kolom untuk Data Table (Format Sederhana & Akurat) ---
export const columns: ColumnDef<StockOpname>[] = [
    {
      accessorKey: "medicineName",
      header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Nama Obat <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => <div className="pl-4">{row.getValue("medicineName")}</div>,
    },
    { accessorKey: "stockSystem", header: () => <div className="text-center">Stok Sistem</div>, cell: ({ row }) => <div className="text-center">{row.getValue("stockSystem")}</div> },
    { accessorKey: "stockReal", header: () => <div className="text-center">Stok Fisik</div>, cell: ({ row }) => <div className="text-center">{row.getValue("stockReal")}</div> },
    {
      accessorKey: "difference",
      header: () => <div className="text-center">Selisih</div>,
      cell: ({ row }) => {
        const difference = row.getValue("difference") as number;
        const color = difference < 0 ? "text-red-500" : "text-green-500";
        return <div className={`text-center font-medium ${color}`}>{difference}</div>
      },
    },
    { accessorKey: "unit", header: "Satuan" },
    {
      accessorKey: "opnameDate",
      header: "Tgl Opname Terakhir",
      cell: ({ row }) => <span>{format(row.getValue("opnameDate") as Date, "d MMM yyyy", { locale: id })}</span>,
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

// --- Komponen Data Table ---
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn: string;
}

function DataTable<TData, TValue>({ columns, data, filterColumn }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting, getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    state: { sorting },
  });

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder={`Cari nama obat...`}
          value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn(filterColumn)?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">Tidak ada data untuk periode yang dipilih.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
      </div>
    </div>
  );
}


// --- Halaman Laporan Utama ---
export default function ReportPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [allOpnames, setAllOpnames] = useState<StockOpname[]>([]);
  const [laporanData, setLaporanData] = useState<StockOpname[]>([]);
  const [officials, setOfficials] = useState<Officials>({});
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [printDate, setPrintDate] = useState<Date | undefined>(new Date());

  // 1. Ambil semua data opname & data pejabat sekali saja saat komponen dimuat
  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    // Ambil data pejabat
    getOfficialsAction(user as User).then(result => {
        if (result.success && result.data) {
            setOfficials(result.data);
        } else {
            console.error("Gagal mengambil data pejabat:", result.error);
        }
    });

    // Ambil semua data stock opname
    const q = query(collection(db, "stock-opnames"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const opnamesData: StockOpname[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const opnameDate = data.opnameDate?.toDate();
            if (opnameDate && !isNaN(opnameDate.getTime())) {
                opnamesData.push({
                    id: doc.id, ...data, opnameDate,
                    expireDate: data.expireDate?.toDate(),
                } as StockOpname);
            }
        });
        setAllOpnames(opnamesData);
        setLoading(false);
    }, (error) => {
        console.error("Gagal mengambil data opname:", error);
        setLoading(false);
        toast({ title: "Gagal Memuat Data", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  // 2. Logika untuk memfilter dan menampilkan laporan
  const handleGenerateReport = () => {
    setLoading(true);
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

    // Filter opname yang terjadi dalam rentang bulan yang dipilih
    const filteredByDate = allOpnames.filter(record => {
        return record.opnameDate >= startDate && record.opnameDate <= endDate;
    });

    if (filteredByDate.length === 0) {
        toast({ title: "Informasi", description: "Tidak ada data stock opname pada periode yang dipilih." });
        setLaporanData([]);
        setLoading(false);
        return;
    }

    // Kelompokkan data berdasarkan batch unik (nama obat + ED)
    const recordsByBatch: { [key: string]: StockOpname[] } = {};
    for (const record of filteredByDate) {
        const expireDateString = record.expireDate ? record.expireDate.toISOString() : 'no-expiry';
        const key = `${record.medicineName}|${expireDateString}`;
        if (!recordsByBatch[key]) recordsByBatch[key] = [];
        recordsByBatch[key].push(record);
    }

    // Dari setiap kelompok, ambil hanya data yang paling baru (opname terakhir di bulan itu)
    const latestRecordsInPeriod = Object.values(recordsByBatch).map(records => {
        return records.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime())[0];
    });
    
    // Urutkan hasil akhir agar mudah dibaca
    latestRecordsInPeriod.sort((a, b) => a.medicineName.localeCompare(b.medicineName));

    setLaporanData(latestRecordsInPeriod);
    setLoading(false);
  };

  // 3. Logika untuk mencetak ke PDF
  const handlePrintReport = () => {
    if (laporanData.length === 0) {
        toast({ title: "Tidak Ada Data", description: "Tidak ada data untuk dicetak.", variant: "destructive" });
        return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // --- KOP SURAT ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const reportTitle = "LAPORAN STOCK OPNAME OBAT-OBATAN DAN VAKSIN";
    const officeName = user?.role === "admin" ? "BIDANG PETERNAKAN DINAS PERIKANAN DAN PETERNAKAN" : (user?.location?.toUpperCase() || "LOKASI UPTD");
    const district = user?.role === "admin" ? "KABUPATEN KUNINGAN" : "";
    
    doc.text(reportTitle, pageWidth / 2, margin, { align: "center" });
    doc.text(officeName, pageWidth / 2, margin + 5, { align: "center" });
    if (district) doc.text(district, pageWidth / 2, margin + 10, { align: "center" });

    const period = `PERIODE: ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: id }).toUpperCase()}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(period, margin, margin + 20);

    // --- TABEL DATA ---
    const head = [["No", "Nama Obat", "Stok Sistem", "Stok Fisik", "Selisih", "Satuan", "Tgl Opname", "Tgl Kedaluwarsa"]];
    const body = laporanData.map((item, index) => [
        index + 1,
        item.medicineName,
        item.stockSystem,
        item.stockReal,
        item.difference,
        item.unit,
        format(item.opnameDate, "d MMM yyyy", { locale: id }),
        item.expireDate ? format(item.expireDate, "d MMM yyyy", { locale: id }) : "-",
    ]);

    autoTable(doc, {
        startY: margin + 25,
        head: head,
        body: body,
        theme: "grid",
        headStyles: { fillColor: [22, 160, 133], textColor: 255, halign: "center", valign: "middle", fontSize: 8 },
        styles: { cellPadding: 1, fontSize: 8, halign: "center" },
        columnStyles: { 1: { halign: "left" } },
    });

    // --- TANDA TANGAN ---
    const finalY = (doc as any).lastAutoTable.finalY || doc.internal.pageSize.getHeight() / 2;
    let signatureY = finalY + 10;
    if (signatureY > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        signatureY = margin;
    }

    doc.setFontSize(10);
    const signatureDate = printDate ? format(printDate, "d MMMM yyyy", { locale: id }) : format(new Date(), "d MMMM yyyy", { locale: id });
    const placeholderName = "(.........................................)";
    const placeholderNip = "NIP. .....................................";

    // Tanda tangan disesuaikan dengan role
    if (user?.role === "admin") {
      // Tiga tanda tangan untuk admin
      doc.text("Mengetahui,", margin, signatureY);
      doc.text("Kepala Dinas Perikanan dan Peternakan", margin, signatureY + 4);
      doc.text(officials.kepalaDinas || placeholderName, margin, signatureY + 28);
      doc.text(officials.nipKepalaDinas ? `NIP. ${officials.nipKepalaDinas}` : placeholderNip, margin, signatureY + 32);

      const centerPos = pageWidth / 2;
      doc.text("Kepala Bidang Peternakan", centerPos, signatureY + 4, { align: "center" });
      doc.text(officials.kepalaBidang || placeholderName, centerPos, signatureY + 28, { align: "center" });
      doc.text(officials.nipKepalaBidang ? `NIP. ${officials.nipKepalaBidang}` : placeholderNip, centerPos, signatureY + 32, { align: "center" });

      doc.text(`Kuningan, ${signatureDate}`, pageWidth - margin, signatureY, { align: "right" });
      doc.text("Petugas,", pageWidth - margin, signatureY + 4, { align: "right" });
      doc.text(user?.name || placeholderName, pageWidth - margin, signatureY + 28, { align: "right" });
      doc.text(user?.nip ? `NIP. ${user.nip}` : placeholderNip, pageWidth - margin, signatureY + 32, { align: "right" });
    } else {
      // Dua tanda tangan untuk non-admin
      doc.text("Mengetahui,", margin, signatureY);
      doc.text("Kepala UPTD", margin, signatureY + 4);
      doc.text(officials.kepalaUPTD || placeholderName, margin, signatureY + 28);
      doc.text(officials.nipKepalaUPTD ? `NIP. ${officials.nipKepalaUPTD}` : placeholderNip, margin, signatureY + 32);

      doc.text(`Kuningan, ${signatureDate}`, pageWidth - margin, signatureY, { align: "right" });
      doc.text("Yang Melaporkan,", pageWidth - margin, signatureY + 4, { align: "right" });
      doc.text(user?.name || placeholderName, pageWidth - margin, signatureY + 28, { align: "right" });
      doc.text(user?.nip ? `NIP. ${user.nip}` : placeholderNip, pageWidth - margin, signatureY + 32, { align: "right" });
    }

    doc.save(`laporan-stock-opname-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading && allOpnames.length === 0) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>
  }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan Stock Opname</h2>
          <p className="text-muted-foreground">Pilih periode untuk melihat dan mencetak laporan stok opname.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 rounded-lg border p-4">
        <div className="flex flex-col space-y-2">
          <span className="text-sm font-medium">Periode Laporan</span>
          <div className="flex gap-2">
            <Select onValueChange={(value) => setSelectedMonth(parseInt(value))} defaultValue={String(selectedMonth)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i} value={String(i)}>{format(new Date(2000, i), "LLLL", { locale: id })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSelectedYear(parseInt(value))} defaultValue={String(selectedYear)}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="Pilih Tahun" /></SelectTrigger>
              <SelectContent>
                {years.map((year) => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <span className="text-sm font-medium">Tanggal Cetak Laporan</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !printDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {printDate ? format(printDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={printDate} onSelect={setPrintDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? "Memuat..." : "Tampilkan Laporan"}
          </Button>
          <Button onClick={handlePrintReport} disabled={laporanData.length === 0} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Cetak Laporan
          </Button>
        </div>
      </div>

      <div className="pt-8">
        <DataTable data={laporanData} columns={columns} filterColumn="medicineName" />
      </div>
    </div>
  );
}
