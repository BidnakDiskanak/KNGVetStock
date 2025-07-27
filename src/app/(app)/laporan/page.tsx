"use client";

import { useEffect, useState } from "react";
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
import { getOfficialsAction } from "@/actions/settings-actions";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Definisikan tipe data LENGKAP untuk laporan
interface ReportData {
  id: string;
  opnameDate: string;
  medicineName: string;
  jenisObat?: string;
  satuan?: string;
  expireDate?: string;
  asalBarang?: string;
  keadaanBulanLaluBaik: number;
  keadaanBulanLaluRusak: number;
  keadaanBulanLaluJml: number;
  pemasukanBaik: number;
  pemasukanRusak: number;
  pemasukanJml: number;
  pengeluaranBaik: number;
  pengeluaranRusak: number;
  pengeluaranJml: number;
  keadaanBulanLaporanBaik: number;
  keadaanBulanLaporanRusak: number;
  keadaanBulanLaporanJml: number;
  keterangan?: string;
}

// Definisikan tipe data untuk pejabat
interface Officials {
    kepalaDinas?: string;
    kepalaBidang?: string;
}

export default function ReportPage() {
  const { user } = useUser();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [officials, setOfficials] = useState<Officials>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchOfficials() {
        const result = await getOfficialsAction();
        if (result.success && result.data) {
            setOfficials(result.data);
        } else {
            console.error("Gagal mengambil data pejabat:", result.error);
        }
    }
    fetchOfficials();
  }, []);

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

  const handlePrintReport = () => {
    if (reportData.length === 0) {
        toast({
            title: "Tidak Ada Data",
            description: "Tidak ada data untuk dicetak. Silakan tampilkan laporan terlebih dahulu.",
            variant: "destructive",
        });
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

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

    const period = `PERIODE: ${startDate ? format(startDate, "MMMM yyyy", { locale: id }).toUpperCase() : ''}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(period, margin, margin + 20);

    const head = [
        [
            { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'JENIS OBAT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'NAMA OBAT', colSpan: 2, styles: { halign: 'center' } },
            { content: 'KEADAAN BULAN LALU', colSpan: 3, styles: { halign: 'center' } },
            { content: 'PEMASUKAN', colSpan: 3, styles: { halign: 'center' } },
            { content: 'PENGELUaran', colSpan: 3, styles: { halign: 'center' } },
            { content: 'KEADAAN S/D BULAN LAPORAN', colSpan: 3, styles: { halign: 'center' } },
            { content: 'EXPIRE DATE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'ASAL BARANG', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'KETERANGAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        ],
        [
            { content: 'SATUAN', styles: { halign: 'center' } },
            { content: '' },
            'BAIK', 'RUSAK', 'JML',
            'BAIK', 'RUSAK', 'JML',
            'BAIK', 'RUSAK', 'JML',
            'BAIK', 'RUSAK', 'JML',
        ]
    ];

    const body = reportData.map((item, index) => [
        index + 1,
        item.jenisObat || '',
        item.medicineName,
        item.satuan || '',
        item.keadaanBulanLaluBaik, item.keadaanBulanLaluRusak, item.keadaanBulanLaluJml,
        item.pemasukanBaik, item.pemasukanRusak, item.pemasukanJml,
        item.pengeluaranBaik, item.pengeluaranRusak, item.pengeluaranJml,
        item.keadaanBulanLaporanBaik, item.keadaanBulanLaporanRusak, item.keadaanBulanLaporanJml,
        item.expireDate || '',
        item.asalBarang || '',
        item.keterangan || '',
    ]);

    autoTable(doc, {
        startY: margin + 25,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], textColor: 255, halign: 'center', valign: 'middle', fontSize: 8 },
        styles: { cellPadding: 1, fontSize: 8, halign: 'center' },
        columnStyles: {
            1: { halign: 'left' },
            2: { halign: 'left' },
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || pageHeight / 2;
    let signatureY = finalY + 10;

    if (signatureY > pageHeight - 40) {
        doc.addPage();
        signatureY = margin;
    }

    doc.setFontSize(10);
    const today = format(new Date(), "d MMMM yyyy", { locale: id });
    const placeholder = "(.........................................)";

    if (user?.role === 'admin') {
        doc.text("Mengetahui,", margin, signatureY);
        doc.text("Kepala Dinas Perikanan dan Peternakan", margin, signatureY + 4);
        doc.text("Kabupaten Kuningan", margin, signatureY + 8);
        doc.text(officials.kepalaDinas || placeholder, margin, signatureY + 28);
        
        const centerPos = pageWidth / 2;
        doc.text("Kepala Bidang Peternakan", centerPos, signatureY + 4, { align: 'center' });
        doc.text(officials.kepalaBidang || placeholder, centerPos, signatureY + 28, { align: 'center' });

        doc.text(`Kuningan, ${today}`, pageWidth - margin, signatureY, { align: 'right' });
        doc.text("Petugas,", pageWidth - margin, signatureY + 4, { align: 'right' });
        doc.text(user?.name || placeholder, pageWidth - margin, signatureY + 28, { align: 'right' });
    } else {
        doc.text("Mengetahui,", margin, signatureY);
        doc.text("Kepala UPTD", margin, signatureY + 4);
        doc.text(placeholder, margin, signatureY + 28);

        doc.text(`Kuningan, ${today}`, pageWidth - margin, signatureY, { align: 'right' });
        doc.text("Yang Melaporkan,", pageWidth - margin, signatureY + 4, { align: 'right' });
        doc.text(user?.name || placeholder, pageWidth - margin, signatureY + 28, { align: 'right' });
    }

    doc.save(`laporan-stock-opname-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };
  
  const columns: ColumnDef<ReportData>[] = [
    { accessorKey: "medicineName", header: "Nama Obat" },
    { accessorKey: "keadaanBulanLaporanJml", header: "Stok Akhir" },
    { accessorKey: "opnameDate", header: "Tanggal Catat" },
    { accessorKey: "keterangan", header: "Keterangan" },
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
            <Button onClick={handlePrintReport} disabled={loading || reportData.length === 0} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Cetak Laporan
            </Button>
        </div>
      </div>

      <div className="pt-8">
        <DataTable data={reportData} columns={columns} filterColumn="medicineName" />
      </div>
    </div>
  );
}