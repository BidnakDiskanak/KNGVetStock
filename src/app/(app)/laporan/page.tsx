"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useUser } from "@/contexts/UserProvider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from '@/app/(app)/stock-opname/components/data-table';
import { getReportDataAction } from "@/actions/report-actions";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Definisikan tipe data untuk laporan
interface ReportData {
  id: string;
  medicineName: string;
  quantity: number;
  opnameDate: string;
}

export default function ReportPage() {
  const { user } = useUser();
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
    setReportData([]);

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

  // Fungsi untuk mencetak laporan ke PDF dengan format resmi
  const handlePrintReport = () => {
    if (reportData.length === 0) {
        toast({
            title: "Tidak Ada Data",
            description: "Tidak ada data untuk dicetak. Silakan tampilkan laporan terlebih dahulu.",
            variant: "destructive",
        });
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // --- 1. KOP SURAT (HEADER) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (user?.role === 'admin') {
        doc.text("LAPORAN STOCK OPNAME BARANG OBAT-OBATAN DAN VAKSIN", pageWidth / 2, margin, { align: 'center' });
        doc.text("BIDANG PETERNAKAN DINAS PERIKANAN DAN PETERNAKAN", pageWidth / 2, margin + 5, { align: 'center' });
        doc.text("KABUPATEN KUNINGAN", pageWidth / 2, margin + 10, { align: 'center' });
    } else {
        doc.text(`LAPORAN STOCK OPNAME OBAT-OBATAN DAN VAKSIN`, pageWidth / 2, margin, { align: 'center' });
        doc.text(user?.location?.toUpperCase() || 'LOKASI UPTD', pageWidth / 2, margin + 5, { align: 'center' });
    }

    // --- 2. PERIODE LAPORAN ---
    const period = `PERIODE: ${startDate ? format(startDate, "MMMM yyyy", { locale: id }).toUpperCase() : ''}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(period, margin, margin + 20);

    // --- 3. TABEL DATA ---
    const tableColumns = ["No", "Nama Obat", "Jumlah", "Tanggal Opname"];
    const tableRows = reportData.map((item, index) => [
        index + 1,
        item.medicineName,
        item.quantity,
        item.opnameDate,
    ]);

    autoTable(doc, {
        startY: margin + 25,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { cellPadding: 2, fontSize: 10 },
    });

    // --- 4. KOLOM TANDA TANGAN ---
    const finalY = (doc as any).lastAutoTable.finalY || margin + 50;
    let signatureY = finalY + 15;

    // Jika tanda tangan tidak muat, pindah ke halaman baru
    if (signatureY > pageHeight - 50) {
        doc.addPage();
        signatureY = margin;
    }

    doc.setFontSize(11);
    const today = format(new Date(), "d MMMM yyyy", { locale: id });

    if (user?.role === 'admin') {
        // Tanda tangan untuk Admin Dinas
        doc.text("Mengetahui,", margin, signatureY);
        doc.text("Kepala Dinas Perikanan dan Peternakan", margin, signatureY + 5);
        doc.text("Kabupaten Kuningan", margin, signatureY + 10);
        doc.text("(.........................................)", margin, signatureY + 35);
        
        const centerPos = pageWidth / 2;
        doc.text("Kepala Bidang Peternakan", centerPos, signatureY + 5, { align: 'center' });
        doc.text("(.........................................)", centerPos, signatureY + 35, { align: 'center' });

        doc.text(`Kuningan, ${today}`, pageWidth - margin, signatureY, { align: 'right' });
        doc.text("Petugas,", pageWidth - margin, signatureY + 5, { align: 'right' });
        doc.text(user?.name || '(.........................................)', pageWidth - margin, signatureY + 35, { align: 'right' });
    } else {
        // Tanda tangan untuk User UPTD
        doc.text("Mengetahui,", margin, signatureY);
        doc.text("Kepala UPTD", margin, signatureY + 5);
        doc.text("(.........................................)", margin, signatureY + 35);

        doc.text(`Kuningan, ${today}`, pageWidth - margin, signatureY, { align: 'right' });
        doc.text("Yang Melaporkan,", pageWidth - margin, signatureY + 5, { align: 'right' });
        doc.text(user?.name || '(.........................................)', pageWidth - margin, signatureY + 35, { align: 'right' });
    }

    // --- 5. SIMPAN PDF ---
    doc.save(`laporan-stock-opname-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
        <div className="flex items-end gap-2">
            <Button onClick={handleGenerateReport} disabled={loading}>
                {loading ? "Menghasilkan..." : "Tampilkan Laporan"}
            </Button>
            {/* Tombol Cetak Laporan Baru */}
            <Button onClick={handlePrintReport} disabled={loading || reportData.length === 0} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Cetak Laporan
            </Button>
        </div>
      </div>

      {/* Bagian Tabel Hasil Laporan */}
      <div className="pt-8">
        <DataTable data={reportData} columns={columns} filterColumn="medicineName" />
      </div>
    </div>
  );
}