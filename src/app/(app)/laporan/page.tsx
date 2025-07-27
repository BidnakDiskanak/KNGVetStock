"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from '@/app/(app)/stock-opname/components/data-table'; // Kita gunakan ulang DataTable
import { getReportDataAction } from "@/actions/report-actions";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Definisikan tipe data untuk laporan
interface ReportData {
  id: string;
  medicineName: string;
  quantity: number;
  opnameDate: string; // Kita akan gunakan string untuk kemudahan tampilan
}

export default function ReportPage() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Peringatan",
        description: "Silakan pilih tanggal mulai dan tanggal selesai.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setReportData([]); // Kosongkan data lama

    const result = await getReportDataAction({ startDate, endDate });

    if (result.success && result.data) {
      setReportData(result.data);
      if (result.data.length === 0) {
        toast({
          title: "Informasi",
          description: "Tidak ada data stock opname pada periode yang dipilih.",
        });
      }
    } else {
      toast({
        title: "Gagal Menghasilkan Laporan",
        description: result.error || "Terjadi kesalahan.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };
  
  // Definisikan kolom untuk tabel laporan
  const columns: ColumnDef<ReportData>[] = [
    {
      accessorKey: "medicineName",
      header: "Nama Obat",
    },
    {
      accessorKey: "quantity",
      header: "Jumlah",
    },
    {
      accessorKey: "opnameDate",
      header: "Tanggal Opname",
    },
  ];

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan Stock Opname</h2>
          <p className="text-muted-foreground">
            Pilih periode untuk melihat laporan stock opname historis.
          </p>
        </div>
      </div>

      {/* Bagian Pemilih Tanggal */}
      <div className="flex flex-col md:flex-row items-center gap-4 rounded-lg border p-4">
        <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium">Tanggal Mulai</span>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
        <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium">Tanggal Selesai</span>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn("w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
        <Button onClick={handleGenerateReport} disabled={loading} className="mt-auto">
          {loading ? "Menghasilkan..." : "Tampilkan Laporan"}
        </Button>
      </div>

      {/* Bagian Tabel Hasil Laporan */}
      <div className="pt-8">
        <DataTable data={reportData} columns={columns} filterColumn="medicineName" />
      </div>
    </div>
  );
}