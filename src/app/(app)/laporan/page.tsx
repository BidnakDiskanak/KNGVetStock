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
    SelectValue 
} from "@/components/ui/select";
import { DataTable } from '@/app/(app)/stock-opname/components/data-table';
import { getReportDataAction } from "@/actions/report-actions";
import { getOfficialsAction } from "@/actions/settings-actions";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ReportData, Officials, User } from "@/lib/types"; // Import tipe data

export default function ReportPage() {
  const { user } = useUser();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [officials, setOfficials] = useState<Officials>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [printDate, setPrintDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    async function fetchOfficials() {
        // --- PERUBAHAN DI SINI: Kirim data user saat mengambil data pejabat ---
        if (user) {
            const result = await getOfficialsAction(user as User);
            if (result.success && result.data) {
                setOfficials(result.data);
            } else {
                console.error("Gagal mengambil data pejabat:", result.error);
            }
        }
    }
    fetchOfficials();
  }, [user]); // Tambahkan user sebagai dependency

  const handleGenerateReport = async () => {
    if (!user) {
        toast({ title: "Error", description: "Silakan login ulang.", variant: "destructive" });
        return;
    }
    setLoading(true);
    setReportData([]);

    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

    // --- PERUBAHAN DI SINI: Kirim data user saat mengambil data laporan ---
    const result = await getReportDataAction({ endDate }, user as User);

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
    // ... (Logika handlePrintReport tetap sama, tapi sekarang akan menggunakan data 'officials' yang benar)
    if (reportData.length === 0) { /* ... */ return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    // ... (Sisa kode header dan tabel)

    // --- PERUBAHAN DI SINI: Logika tanda tangan untuk UPTD ---
    // ... (Sisa kode sebelum tanda tangan)
    if (user?.role === 'admin') {
        // Tanda tangan Admin Dinas (sudah benar)
    } else {
        // Tanda tangan untuk User UPTD (sekarang dinamis)
        doc.text("Mengetahui,", margin, signatureY);
        doc.text("Kepala UPTD", margin, signatureY + 4);
        doc.text(officials.kepalaUPTD || placeholderName, margin, signatureY + 28);
        doc.text(officials.nipKepalaUPTD ? `NIP. ${officials.nipKepalaUPTD}` : placeholderNip, margin, signatureY + 32);

        doc.text(`Kuningan, ${signatureDate}`, pageWidth - margin, signatureY, { align: 'right' });
        doc.text("Yang Melaporkan,", pageWidth - margin, signatureY + 4, { align: 'right' });
        doc.text(user?.name || placeholderName, pageWidth - margin, signatureY + 28, { align: 'right' });
        doc.text(user?.nip ? `NIP. ${user.nip}` : placeholderNip, pageWidth - margin, signatureY + 32, { align: 'right' });
    }

    doc.save(`laporan-stock-opname-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };
  
  const columns: ColumnDef<ReportData>[] = [
    // ... (Definisi kolom tetap sama)
  ];

  return (
    // ... (Tampilan JSX tetap sama)
  );
}