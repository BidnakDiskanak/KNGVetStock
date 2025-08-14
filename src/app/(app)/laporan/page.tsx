"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/app/(app)/stock-opname/components/data-table";
import { getReportDataAction } from "@/actions/report-actions";
import { getOfficialsAction } from "@/actions/settings-actions";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ReportData, Officials, User } from "@/lib/types";

// Fungsi pengurutan asli Anda, tetap dipertahankan.
function urutkanDataLaporan(data: ReportData[]): ReportData[] {
  const dataToSort = [...data];

  dataToSort.sort((a, b) => {
    const jenisA = a.jenisObat || "";
    const jenisB = b.jenisObat || "";
    const perbandinganJenis = jenisA.localeCompare(jenisB);
    if (perbandinganJenis !== 0) {
      return perbandinganJenis;
    }

    const namaA = a.medicineName || "";
    const namaB = b.medicineName || "";
    const perbandinganNama = namaA.localeCompare(namaB);
    if (perbandinganNama !== 0) {
      return perbandinganNama;
    }

    const tanggalA = a.expireDate ? a.expireDate.getTime() : 0;
    const tanggalB = b.expireDate ? b.expireDate.getTime() : 0;

    if (!tanggalA && !tanggalB) return 0;
    if (!tanggalA) return 1;
    if (!tanggalB) return -1;

    return tanggalA - tanggalB;
  });

  return dataToSort;
}

export default function ReportPage() {
  const { user } = useUser();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [officials, setOfficials] = useState<Officials>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [printDate, setPrintDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    async function fetchOfficials() {
      if (user) {
        const result = await getOfficialsAction(user as User);
        if (result.success && result.data) {
          // Data dari pengaturan (nama dinas, alamat, dll.) akan tersimpan di sini
          setOfficials(result.data);
        } else {
          console.error("Gagal mengambil data pejabat:", result.error);
        }
      }
    }
    fetchOfficials();
  }, [user]);

  const handleGenerateReport = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Silakan login ulang.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setReportData([]);

    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

    const result = await getReportDataAction({ endDate }, user as User);

    if (result.success && result.data) {
      const latestDataMap = new Map<string, ReportData>();

      for (const item of result.data) {
        const key = `${item.medicineName}|${item.expireDate?.toISOString()}`;
        const existingItem = latestDataMap.get(key);
        
        if (!existingItem || (item.opnameDate && existingItem.opnameDate && item.opnameDate > existingItem.opnameDate)) {
            latestDataMap.set(key, item);
        }
      }

      const filteredData = Array.from(latestDataMap.values());
      const dataUrut = urutkanDataLaporan(filteredData);
      setReportData(dataUrut);

      if (dataUrut.length === 0) {
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
        description: "Tidak ada data untuk dicetak.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    // --- PERBAIKAN KOP SURAT ---
    if (user?.role === "admin") {
      doc.text(
        officials.namaDinas || "DINAS PERIKANAN DAN PETERNAKAN",
        pageWidth / 2,
        margin,
        { align: "center" }
      );
      doc.setFontSize(10);
      doc.text(
        officials.alamatDinas || "Alamat Dinas",
        pageWidth / 2,
        margin + 5,
        { align: "center" }
      );
    } else {
      doc.text(
        officials.namaUPTD || user?.location?.toUpperCase() || "UPTD",
        pageWidth / 2,
        margin,
        { align: "center" }
      );
      doc.setFontSize(10);
      doc.text(
        officials.alamatUPTD || "Alamat UPTD",
        pageWidth / 2,
        margin + 5,
        { align: "center" }
      );
    }
    // --- AKHIR PERBAIKAN KOP SURAT ---

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      "LAPORAN STOCK OPNAME BARANG OBAT-OBATAN DAN VAKSIN",
      pageWidth / 2,
      margin + 12,
      { align: "center" }
    );

    const period = `PERIODE: ${format(
      new Date(selectedYear, selectedMonth),
      "MMMM yyyy",
      { locale: id }
    ).toUpperCase()}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(period, margin, margin + 22);

    const head = [
      [
        { content: "NO", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "JENIS OBAT", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "NAMA OBAT", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "SATUAN", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "KEADAAN BULAN LALU", colSpan: 3, styles: { halign: "center" } },
        { content: "PEMASUKAN", colSpan: 3, styles: { halign: "center" } },
        { content: "PENGELUARAN", colSpan: 3, styles: { halign: "center" } },
        { content: "KEADAAN S/D BULAN LAPORAN", colSpan: 3, styles: { halign: "center" } },
        { content: "EXPIRE DATE", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "ASAL BARANG", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "KETERANGAN", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      ],
      [ "BAIK", "RUSAK", "JML", "BAIK", "RUSAK", "JML", "BAIK", "RUSAK", "JML", "BAIK", "RUSAK", "JML" ],
    ];

    const dataUrut = urutkanDataLaporan(reportData);
    const body = dataUrut.map((item, index) => [
      index + 1, item.jenisObat || "", item.medicineName, item.satuan || "",
      item.keadaanBulanLaluBaik, item.keadaanBulanLaluRusak, item.keadaanBulanLaluJml,
      item.pemasukanBaik, item.pemasukanRusak, item.pemasukanJml,
      item.pengeluaranBaik, item.pengeluaranRusak, item.pengeluaranJml,
      item.keadaanBulanLaporanBaik, item.keadaanBulanLaporanRusak, item.keadaanBulanLaporanJml,
      item.expireDate ? format(item.expireDate, "d LLL yyyy", { locale: id }) : "",
      item.asalBarang || "", item.keterangan || "",
    ]);

    autoTable(doc, {
      startY: margin + 27, head, body, theme: "grid",
      headStyles: { fillColor: [22, 160, 133], textColor: 255, halign: "center", valign: "middle", fontSize: 8 },
      styles: { cellPadding: 1, fontSize: 8, halign: "center" },
      columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
    });

    const finalY = (doc as any).lastAutoTable.finalY || pageHeight / 2;
    let signatureY = finalY + 10;

    if (signatureY > pageHeight - 50) {
      doc.addPage();
      signatureY = margin;
    }

    doc.setFontSize(10);
    const signatureDate = printDate ? format(printDate, "d MMMM yyyy", { locale: id }) : format(new Date(), "d MMMM yyyy", { locale: id });
    const placeholderName = "(.........................................)";
    const placeholderNip = "NIP. .....................................";
    
    // --- PERBAIKAN TANGGAL & LOKASI TANDA TANGAN ---
    const locationAndDateText = user?.role === 'admin'
      ? `${officials.kabupaten || 'Kabupaten'}, ${signatureDate}`
      : `${officials.kecamatan || 'Kecamatan'}, ${signatureDate}`;
    // --- AKHIR PERBAIKAN ---

    if (user?.role === "admin") {
      doc.text("Mengetahui,", margin, signatureY);
      doc.text("Kepala Dinas Perikanan dan Peternakan", margin, signatureY + 4);
      doc.text(officials.kepalaDinas || placeholderName, margin, signatureY + 28);
      doc.text(officials.nipKepalaDinas ? `NIP. ${officials.nipKepalaDinas}` : placeholderNip, margin, signatureY + 32);

      const centerPos = pageWidth / 2;
      doc.text("Kepala Bidang Peternakan", centerPos, signatureY + 4, { align: "center" });
      doc.text(officials.kepalaBidang || placeholderName, centerPos, signatureY + 28, { align: "center" });
      doc.text(officials.nipKepalaBidang ? `NIP. ${officials.nipKepalaBidang}` : placeholderNip, centerPos, signatureY + 32, { align: "center" });

      doc.text(locationAndDateText, pageWidth - margin, signatureY, { align: "right" });
      doc.text("Petugas,", pageWidth - margin, signatureY + 4, { align: "right" });
      doc.text(user?.name || placeholderName, pageWidth - margin, signatureY + 28, { align: "right" });
      doc.text(user?.nip ? `NIP. ${user.nip}` : placeholderNip, pageWidth - margin, signatureY + 32, { align: "right" });
    } else {
      doc.text("Mengetahui,", margin, signatureY);
      doc.text("Kepala UPTD", margin, signatureY + 4);
      doc.text(officials.kepalaUPTD || placeholderName, margin, signatureY + 28);
      doc.text(officials.nipKepalaUPTD ? `NIP. ${officials.nipKepalaUPTD}` : placeholderNip, margin, signatureY + 32);

      doc.text(locationAndDateText, pageWidth - margin, signatureY, { align: "right" });
      doc.text("Yang Melaporkan,", pageWidth - margin, signatureY + 4, { align: "right" });
      doc.text(user?.name || placeholderName, pageWidth - margin, signatureY + 28, { align: "right" });
      doc.text(user?.nip ? `NIP. ${user.nip}` : placeholderNip, pageWidth - margin, signatureY + 32, { align: "right" });
    }

    doc.save(`laporan-stock-opname-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const columns: ColumnDef<ReportData>[] = [
    {
      accessorKey: "medicineName",
      header: () => <div className="text-left">Nama Obat</div>,
      cell: ({ row }) => (<div className="text-left font-medium">{row.original.medicineName}</div>),
    },
    {
      id: "keadaanBulanLaluGroup",
      header: () => <div className="text-center">Keadaan Bulan Lalu</div>,
      columns: [
        { header: () => <div className="text-center">Baik</div>, accessorKey: "keadaanBulanLaluBaik", cell: ({ row }) => (<div className="text-center">{row.original.keadaanBulanLaluBaik}</div>) },
        { header: () => <div className="text-center">Rusak</div>, accessorKey: "keadaanBulanLaluRusak", cell: ({ row }) => (<div className="text-center">{row.original.keadaanBulanLaluRusak}</div>) },
        { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "keadaanBulanLaluJml", cell: ({ row }) => (<div className="text-center font-bold">{row.original.keadaanBulanLaluJml}</div>) },
      ],
    },
    {
      id: "pemasukanGroup",
      header: () => <div className="text-center">Pemasukan</div>,
      columns: [
        { header: () => <div className="text-center">Baik</div>, accessorKey: "pemasukanBaik", cell: ({ row }) => (<div className="text-center">{row.original.pemasukanBaik}</div>) },
        { header: () => <div className="text-center">Rusak</div>, accessorKey: "pemasukanRusak", cell: ({ row }) => (<div className="text-center">{row.original.pemasukanRusak}</div>) },
        { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "pemasukanJml", cell: ({ row }) => (<div className="text-center font-bold">{row.original.pemasukanJml}</div>) },
      ],
    },
    {
      id: "pengeluaranGroup",
      header: () => <div className="text-center">Pengeluaran</div>,
      columns: [
        { header: () => <div className="text-center">Baik</div>, accessorKey: "pengeluaranBaik", cell: ({ row }) => (<div className="text-center">{row.original.pengeluaranBaik}</div>) },
        { header: () => <div className="text-center">Rusak</div>, accessorKey: "pengeluaranRusak", cell: ({ row }) => (<div className="text-center">{row.original.pengeluaranRusak}</div>) },
        { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "pengeluaranJml", cell: ({ row }) => (<div className="text-center font-bold">{row.original.pengeluaranJml}</div>) },
      ],
    },
    {
      id: "keadaanBulanLaporanGroup",
      header: () => <div className="text-center">Keadaan Bulan Laporan</div>,
      columns: [
        { header: () => <div className="text-center">Baik</div>, accessorKey: "keadaanBulanLaporanBaik", cell: ({ row }) => (<div className="text-center">{row.original.keadaanBulanLaporanBaik}</div>) },
        { header: () => <div className="text-center">Rusak</div>, accessorKey: "keadaanBulanLaporanRusak", cell: ({ row }) => (<div className="text-center">{row.original.keadaanBulanLaporanRusak}</div>) },
        { header: () => <div className="text-center font-bold">Jml</div>, accessorKey: "keadaanBulanLaporanJml", cell: ({ row }) => (<div className="text-center font-bold">{row.original.keadaanBulanLaporanJml}</div>) },
      ],
    },
    {
      id: "expireDateGroup",
      header: "Expire Date",
      accessorKey: "expireDate",
      cell: ({ row }) => {
        const date = row.original.expireDate;
        if (date instanceof Date && !isNaN(date.getTime())) {
          return (<div className="text-center">{format(date, "d LLL yyyy", { locale: id })}</div>);
        }
        return <div className="text-center">-</div>;
      },
    },
  ];

  const years = [2023, 2024, 2025];

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan Stock Opname</h2>
          <p className="text-muted-foreground">Pilih periode untuk melihat laporan stock opname historis.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 rounded-lg border p-4">
        <div className="flex flex-col space-y-2">
          <span className="text-sm font-medium">Periode Laporan</span>
          <div className="flex gap-2">
            <Select onValueChange={(value) => setSelectedMonth(parseInt(value))} defaultValue={String(selectedMonth)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (<SelectItem key={i} value={String(i)}>{format(new Date(2000, i), "LLLL", { locale: id })}</SelectItem>))}
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
                {printDate ? format(printDate, "PPP", { locale: id }) : (<span>Pilih tanggal</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={printDate} onSelect={setPrintDate} captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? "Menghasilkan..." : "Tampilkan Laporan"}
          </Button>
          <Button onClick={handlePrintReport} disabled={loading || reportData.length === 0} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Cetak Laporan
          </Button>
        </div>
      </div>

      <div className="pt-8">
        <DataTable data={reportData} columns={columns} filterColumn="medicineName" />
      </div>
    </div>
  );
}
