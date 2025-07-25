"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FileDown, FileText as FileTextIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useUser } from '@/contexts/UserProvider';
import type { AppSettings, Medicine } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { collection, doc, getDoc, getDocs, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { endOfMonth, startOfMonth } from 'date-fns';


// Extend jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}


export default function LaporanPage() {
  const { user } = useUser();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [generated, setGenerated] = useState(false);
  const [reportData, setReportData] = useState<Medicine[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [uptdNameForReport, setUptdNameForReport] = useState('');


  useEffect(() => {
    const settingsDocRef = doc(db, "settings", "app");
    const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
            setSettings(doc.data() as AppSettings);
        } else {
            console.log("No settings document!");
        }
    });
    
    // Set the UPTD name for the report based on the user's role and location
    if (user?.role === 'user') {
        setUptdNameForReport(user.location);
    } else if (settings?.uptdName) {
        setUptdNameForReport(settings.uptdName);
    }

    return () => unsubscribe();
  }, [user, settings?.uptdName]);

  const generateReport = async () => {
    if (!date || !user) return;
    setLoading(true);
    setGenerated(false);

    const start = startOfMonth(date);
    const end = endOfMonth(date);

    let medQuery;
    if (user.role === 'admin') {
      medQuery = query(collection(db, "medicines"), where("location", "==", "dinas"));
    } else {
      medQuery = query(collection(db, "medicines"), where("userId", "==", user.id));
    }
    
    // Fetch all medicines once to generate the report
    const querySnapshot = await getDocs(medQuery);
    const meds: Medicine[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          expiryDate: (data.expiryDate as Timestamp).toDate(),
          dateAdded: data.dateAdded ? (data.dateAdded as Timestamp).toDate() : new Date(0)
      } as Medicine
    });

    setReportData(meds);
    setLoading(false);
    setGenerated(true);
  };

  const handleExportExcel = () => {
    if (!reportData.length || !date || !user || !settings) return;

    // 1. Create header info
    const title = `DATA STOCK OPNAME BARANG OBAT-OBATAN DAN VAKSIN TAHUN ${format(date, "yyyy")}`;
    const locationName = user.role === 'admin' ? settings.dinasName : uptdNameForReport;
    const period = `PERIODE LAPORAN : ${format(date, "MMMM yyyy", { locale: id }).toUpperCase()}`;

    // 2. Prepare main data
    const formattedData = reportData.map((item, index) => {
      const bl_baik = item.prev_baik || 0;
      const bl_rusak = item.prev_rusak || 0;
      const pemasukan_baik = item.pemasukan_baik || 0;
      const pemasukan_rusak = item.pemasukan_rusak || 0;
      const pengeluaran_baik = item.pengeluaran_baik || 0;
      const pengeluaran_rusak = item.pengeluaran_rusak || 0;
      const sisa_baik = item.sisa_baik || 0;
      const sisa_rusak = item.sisa_rusak || 0;

      return {
        'NO': index + 1,
        'NAMA OBAT': item.name,
        'JENIS OBAT': item.type,
        'SATUAN': item.unit,
        'BAIK_BL': bl_baik,
        'RUSAK_BL': bl_rusak,
        'JML_BL': bl_baik + bl_rusak,
        'BAIK_PEMASUKAN': pemasukan_baik,
        'RUSAK_PEMASUKAN': pemasukan_rusak,
        'JML_PEMASUKAN': pemasukan_baik + pemasukan_rusak,
        'BAIK_PENGELUARAN': pengeluaran_baik,
        'RUSAK_PENGELUARAN': pengeluaran_rusak,
        'JML_PENGELUARAN': pengeluaran_baik + pengeluaran_rusak,
        'BAIK_SISA': sisa_baik,
        'RUSAK_SISA': sisa_rusak,
        'JML_SISA': sisa_baik + sisa_rusak,
        'EXPIRE DATE': format(new Date(item.expiryDate), "dd-MM-yyyy"),
        'KETERANGAN': item.notes,
      };
    });
    
    // 3. Create worksheet from data
    const ws = XLSX.utils.json_to_sheet([], {
      header: [ // Explicitly set headers - Level 2
        'NO', 'NAMA OBAT', 'JENIS OBAT', 'SATUAN',
        'BAIK', 'RUSAK', 'JML', // Keadaan Bulan Lalu
        'BAIK', 'RUSAK', 'JML', // Pemasukan
        'BAIK', 'RUSAK', 'JML', // Pengeluaran
        'BAIK', 'RUSAK', 'JML', // Keadaan s/d Bulan Laporan
        'EXPIRE DATE', 'KETERANGAN'
      ]
    });

    // 4. Manually add merged headers and data
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }];
    XLSX.utils.sheet_add_aoa(ws, [[locationName]], { origin: 'A2' });
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 17 } });
    XLSX.utils.sheet_add_aoa(ws, [[period]], { origin: 'A4' });
    ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 17 } });

    // Add multi-level headers (Level 1)
    const header_level_1 = [
        "", "", "", "",
        { v: "KEADAAN BULAN LALU", s: { alignment: { horizontal: 'center' } } }, "", "",
        { v: "PEMASUKAN", s: { alignment: { horizontal: 'center' } } }, "", "",
        { v: "PENGELUARAN", s: { alignment: { horizontal: 'center' } } }, "", "",
        { v: "KEADAAN S/D BULAN LAPORAN", s: { alignment: { horizontal: 'center' } } }, "", "",
        "", ""
    ];
    XLSX.utils.sheet_add_aoa(ws, [header_level_1], { origin: 'A6' });
    ws['!merges'].push({ s: { r: 5, c: 4 }, e: { r: 5, c: 6 } });   // Merge E6:G6
    ws['!merges'].push({ s: { r: 5, c: 7 }, e: { r: 5, c: 9 } });   // Merge H6:J6
    ws['!merges'].push({ s: { r: 5, c: 10 }, e: { r: 5, c: 12 } }); // Merge K6:M6
    ws['!merges'].push({ s: { r: 5, c: 13 }, e: { r: 5, c: 15 } }); // Merge N6:P6
    
    // Level 2 headers are already set by json_to_sheet, we just need to place them at row 7
    // So we'll skip the header in json_to_sheet and add it manually
    const header_level_2 = [
        'NO', 'NAMA OBAT', 'JENIS OBAT', 'SATUAN',
        'BAIK', 'RUSAK', 'JML',
        'BAIK', 'RUSAK', 'JML',
        'BAIK', 'RUSAK', 'JML',
        'BAIK', 'RUSAK', 'JML',
        'EXPIRE DATE', 'KETERANGAN'
    ];
    XLSX.utils.sheet_add_aoa(ws, [header_level_2], { origin: 'A7' });

    // Add column numbers
    const header_numbers = [...Array(18)].map((_, i) => `(${i + 1})`);
    XLSX.utils.sheet_add_aoa(ws, [header_numbers], { origin: 'A8' });

    // Re-format data to match the new structure (without headers)
    const dataForSheet = formattedData.map(item => [
      item.NO,
      item['NAMA OBAT'],
      item['JENIS OBAT'],
      item.SATUAN,
      item.BAIK_BL,
      item.RUSAK_BL,
      item.JML_BL,
      item.BAIK_PEMASUKAN,
      item.RUSAK_PEMASUKAN,
      item.JML_PEMASUKAN,
      item.BAIK_PENGELUARAN,
      item.RUSAK_PENGELUARAN,
      item.JML_PENGELUARAN,
      item.BAIK_SISA,
      item.RUSAK_SISA,
      item.JML_SISA,
      item['EXPIRE DATE'],
      item.KETERANGAN,
    ]);

    // Add main data below headers
    XLSX.utils.sheet_add_aoa(ws, dataForSheet, { origin: 'A9'});

    // Set column widths
    const columnWidths = [
        { wch: 5 },  // NO
        { wch: 30 }, // NAMA OBAT
        { wch: 15 }, // JENIS OBAT
        { wch: 10 }, // SATUAN
        { wch: 8 }, { wch: 8 }, { wch: 8 }, // BULAN LALU
        { wch: 8 }, { wch: 8 }, { wch: 8 }, // PEMASUKAN
        { wch: 8 }, { wch: 8 }, { wch: 8 }, // PENGELUARAN
        { wch: 8 }, { wch: 8 }, { wch: 8 }, // SISA
        { wch: 15 }, // EXPIRE DATE
        { wch: 30 }  // KETERANGAN
    ];
    ws['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'Laporan Stock Opname');

    XLSX.writeFile(workbook, `Laporan_Stock_Opname_${format(date, "MMMM_yyyy")}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!reportData.length || !date || !user || !settings) return;

    const doc = new jsPDF({ orientation: 'landscape' }) as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 14;

    // 1. Add Titles
    const title = `DATA STOCK OPNAME BARANG OBAT-OBATAN DAN VAKSIN TAHUN ${format(date, "yyyy")}`;
    const locationName = user.role === 'admin' ? (settings.dinasName || '') : (uptdNameForReport || '');
    const period = `PERIODE LAPORAN : ${format(date, "MMMM yyyy", { locale: id }).toUpperCase()}`;
    
    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.text(locationName.toUpperCase(), pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(period, pageMargin, 30);

    // 2. Prepare Table Data
    const head = [
      [
        { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NAMA OBAT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'JENIS OBAT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'SATUAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'KEADAAN BULAN LALU', colSpan: 3, styles: { halign: 'center' } },
        { content: 'PEMASUKAN', colSpan: 3, styles: { halign: 'center' } },
        { content: 'PENGELUARAN', colSpan: 3, styles: { halign: 'center' } },
        { content: 'SISA STOK', colSpan: 3, styles: { halign: 'center' } },
        { content: 'EXPIRE DATE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'KETERANGAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        { content: 'BAIK', styles: { halign: 'center' } },
        { content: 'RUSAK', styles: { halign: 'center' } },
        { content: 'JML', styles: { halign: 'center' } },
        { content: 'BAIK', styles: { halign: 'center' } },
        { content: 'RUSAK', styles: { halign: 'center' } },
        { content: 'JML', styles: { halign: 'center' } },
        { content: 'BAIK', styles: { halign: 'center' } },
        { content: 'RUSAK', styles: { halign: 'center' } },
        { content: 'JML', styles: { halign: 'center' } },
        { content: 'BAIK', styles: { halign: 'center' } },
        { content: 'RUSAK', styles: { halign: 'center' } },
        { content: 'JML', styles: { halign: 'center' } },
      ]
    ];

    const body = reportData.map((item, index) => {
      const bl_baik = item.prev_baik || 0;
      const bl_rusak = item.prev_rusak || 0;
      const pemasukan_baik = item.pemasukan_baik || 0;
      const pemasukan_rusak = item.pemasukan_rusak || 0;
      const pengeluaran_baik = item.pengeluaran_baik || 0;
      const pengeluaran_rusak = item.pengeluaran_rusak || 0;

      return [
        index + 1,
        item.name,
        item.type,
        item.unit,
        bl_baik, bl_rusak, bl_baik + bl_rusak,
        pemasukan_baik, pemasukan_rusak, pemasukan_baik + pemasukan_rusak,
        pengeluaran_baik, pengeluaran_rusak, pengeluaran_baik + pengeluaran_rusak,
        item.sisa_baik, item.sisa_rusak, item.sisa_baik + item.sisa_rusak,
        format(new Date(item.expiryDate), "dd-MM-yyyy"),
        item.notes
      ];
    });

    // 3. Generate Table
    doc.autoTable({
      head: head,
      body: body,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40 },
        17: { cellWidth: 30 },
      },
       margin: { left: pageMargin, right: pageMargin }
    });
    
    // 4. Add Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    const signatureColumnWidth = (pageWidth - (pageMargin * 2)) / 3;

    if (user?.role === 'admin') {
      doc.text("Mengetahui,", pageMargin, finalY, { align: 'left', maxWidth: signatureColumnWidth });
      doc.text(`Kepala ${settings.dinasName}`, pageMargin, finalY + 5, { align: 'left', maxWidth: signatureColumnWidth });
      doc.text(settings.kepalaDinas || '', pageMargin, finalY + 25, { align: 'left', maxWidth: signatureColumnWidth });
      doc.text(`NIP. ${settings.nipKepalaDinas || ''}`, pageMargin, finalY + 30, { align: 'left', maxWidth: signatureColumnWidth });

      doc.text("Kepala Bidang Peternakan", pageWidth / 2, finalY, { align: 'center', maxWidth: signatureColumnWidth });
      doc.text(settings.kepalaBidang || '', pageWidth / 2, finalY + 25, { align: 'center', maxWidth: signatureColumnWidth });
      doc.text(`NIP. ${settings.nipKepalaBidang || ''}`, pageWidth / 2, finalY + 30, { align: 'center', maxWidth: signatureColumnWidth });

      doc.text(`Kuningan, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, pageWidth - pageMargin, finalY, { align: 'right', maxWidth: signatureColumnWidth });
      doc.text("Petugas Opname,", pageWidth - pageMargin, finalY + 5, { align: 'right', maxWidth: signatureColumnWidth });
      doc.text(user.name || '', pageWidth - pageMargin, finalY + 25, { align: 'right', maxWidth: signatureColumnWidth });
      doc.text(`NIP. ${user.nip || ''}`, pageWidth - pageMargin, finalY + 30, { align: 'right', maxWidth: signatureColumnWidth });

    } else { // UPTD User
       doc.text("Mengetahui,", pageMargin, finalY, { align: 'left', maxWidth: signatureColumnWidth });
       doc.text(`Kepala ${uptdNameForReport}`, pageMargin, finalY + 5, { align: 'left', maxWidth: signatureColumnWidth });
       doc.text(settings.kepalaUPTD || '', pageMargin, finalY + 25, { align: 'left', maxWidth: signatureColumnWidth });
       doc.text(`NIP. ${settings.nipKepalaUPTD || ''}`, pageMargin, finalY + 30, { align: 'left', maxWidth: signatureColumnWidth });

       doc.text(`Kuningan, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, pageWidth - pageMargin, finalY, { align: 'right', maxWidth: signatureColumnWidth });
       doc.text("Petugas Opname,", pageWidth - pageMargin, finalY + 5, { align: 'right', maxWidth: signatureColumnWidth });
       doc.text(user?.name || '', pageWidth - pageMargin, finalY + 25, { align: 'right', maxWidth: signatureColumnWidth });
       doc.text(`NIP. ${user?.nip || ''}`, pageWidth - pageMargin, finalY + 30, { align: 'right', maxWidth: signatureColumnWidth });
    }

    // 5. Save PDF
    doc.save(`Laporan_Stock_Opname_${format(date, "MMMM_yyyy")}.pdf`);
  };

  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buat Laporan Stock Opname</CardTitle>
          <CardDescription>Pilih periode bulan dan tahun untuk membuat laporan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "MMMM yyyy", { locale: id }) : <span>Pilih bulan</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                onSelect={(day) => {
                    const newDate = day || new Date();
                    setDate(newDate);
                }}
                selected={date}
                initialFocus
                />
            </PopoverContent>
          </Popover>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? 'Membuat...' : 'Buat Laporan'}
          </Button>
        </CardContent>
      </Card>

      {generated && settings && (
        <Card>
            <CardHeader className="flex flex-row justify-end gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="h-4 w-4 mr-2" /> Export Excel</Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf}><FileTextIcon className="h-4 w-4 mr-2" /> Export PDF</Button>
            </CardHeader>
            <CardContent>
                <div className="bg-white p-4 sm:p-8 rounded-md shadow-lg printable-area">
                    <header className="text-center mb-8">
                        <h1 className="text-lg sm:text-xl font-bold uppercase">DATA STOCK OPNAME BARANG OBAT-OBATAN DAN VAKSIN TAHUN {date ? format(date, "yyyy") : ''}</h1>
                        {user?.role === 'admin' ? (
                            <h2 className="text-lg sm:text-xl font-bold uppercase">{settings.dinasName}</h2>
                        ) : (
                            <h2 className="text-lg sm:text-xl font-bold uppercase">{uptdNameForReport}</h2>
                        )}
                    </header>

                    <div className="mb-4 font-semibold text-sm">
                      PERIODE LAPORAN : {date ? format(date, "MMMM yyyy", { locale: id }).toUpperCase() : ''}
                    </div>

                    <div className="overflow-x-auto">
                    <Table className="border-collapse border border-black text-xs">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border border-black text-center align-middle" rowSpan={2}>NO</TableHead>
                                <TableHead className="border border-black text-center align-middle" rowSpan={2}>NAMA OBAT</TableHead>
                                <TableHead className="border border-black text-center align-middle" rowSpan={2}>JENIS OBAT</TableHead>
                                <TableHead className="border border-black text-center align-middle" rowSpan={2}>SATUAN</TableHead>
                                <TableHead className="border border-black text-center" colSpan={3}>KEADAAN BULAN LALU</TableHead>
                                <TableHead className="border border-black text-center" colSpan={3}>PEMASUKAN</TableHead>
                                <TableHead className="border border-black text-center" colSpan={3}>PENGELUARAN</TableHead>
                                <TableHead className="border border-black text-center" colSpan={3}>KEADAAN S/D BULAN LAPORAN</TableHead>
                                <TableHead className="border border-black text-center align-middle" rowSpan={2}>EXPIRE DATE</TableHead>
                                <TableHead className="border border-black text-center align-middle" rowSpan={2}>KETERANGAN</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead className="border border-black text-center">BAIK</TableHead>
                                <TableHead className="border border-black text-center">RUSAK</TableHead>
                                <TableHead className="border border-black text-center">JML</TableHead>
                                <TableHead className="border border-black text-center">BAIK</TableHead>
                                <TableHead className="border border-black text-center">RUSAK</TableHead>
                                <TableHead className="border border-black text-center">JML</TableHead>
                                <TableHead className="border border-black text-center">BAIK</TableHead>
                                <TableHead className="border border-black text-center">RUSAK</TableHead>
                                <TableHead className="border border-black text-center">JML</TableHead>
                                <TableHead className="border border-black text-center">BAIK</TableHead>
                                <TableHead className="border border-black text-center">RUSAK</TableHead>
                                <TableHead className="border border-black text-center">JML</TableHead>
                            </TableRow>
                             <TableRow>
                                {[...Array(18)].map((_, i) => (
                                    <TableHead key={i} className="border border-black text-center text-xs p-1 h-auto font-normal">({i + 1})</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((item, index) => {
                                const bl_baik = item.prev_baik || 0;
                                const bl_rusak = item.prev_rusak || 0;
                                const pemasukan_baik = item.pemasukan_baik || 0;
                                const pemasukan_rusak = item.pemasukan_rusak || 0;
                                const pengeluaran_baik = item.pengeluaran_baik || 0;
                                const pengeluaran_rusak = item.pengeluaran_rusak || 0;

                                const bl_jml = bl_baik + bl_rusak;
                                const pemasukan_jml = pemasukan_baik + pemasukan_rusak;
                                const pengeluaran_jml = pengeluaran_baik + pengeluaran_rusak;
                                const sisa_baik = item.sisa_baik;
                                const sisa_rusak = item.sisa_rusak;
                                const sisa_jml = sisa_baik + sisa_rusak;

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="border border-black text-center">{index + 1}</TableCell>
                                        <TableCell className="border border-black px-2 py-1">{item.name}</TableCell>
                                        <TableCell className="border border-black text-center">{item.type}</TableCell>
                                        <TableCell className="border border-black text-center">{item.unit}</TableCell>
                                        <TableCell className="border border-black text-center">{bl_baik || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{bl_rusak || ''}</TableCell>
                                        <TableCell className="border border-black text-center font-semibold">{bl_jml || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{pemasukan_baik || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{pemasukan_rusak || ''}</TableCell>
                                        <TableCell className="border border-black text-center font-semibold">{pemasukan_jml || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{pengeluaran_baik || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{pengeluaran_rusak || ''}</TableCell>
                                        <TableCell className="border border-black text-center font-semibold">{pengeluaran_jml || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{sisa_baik || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{sisa_rusak || ''}</TableCell>
                                        <TableCell className="border border-black text-center font-semibold">{sisa_jml || ''}</TableCell>
                                        <TableCell className="border border-black text-center">{format(new Date(item.expiryDate), "dd-MM-yyyy")}</TableCell>
                                        <TableCell className="border border-black px-2 py-1">{item.notes}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    </div>

                    <footer className="mt-8 text-sm sm:text-base print:text-xs">
                        {user?.role === 'admin' ? (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p>Mengetahui,</p>
                                    <p className="font-bold">Kepala {settings.dinasName}</p>
                                    <div className="h-20" />
                                    <p className="font-bold underline">{settings.kepalaDinas}</p>
                                    <p>NIP. {settings.nipKepalaDinas}</p>
                                </div>
                                <div className="text-center">
                                     <p className="invisible">Spacer</p>
                                     <p className="font-bold">Kepala Bidang Peternakan</p>
                                     <div className="h-20" />
                                     <p className="font-bold underline">{settings.kepalaBidang}</p>
                                     <p>NIP. {settings.nipKepalaBidang}</p>
                                </div>
                                <div className="text-center">
                                    <p>Kuningan, {format(new Date(), "dd MMMM yyyy", { locale: id })}</p>
                                    <p className="font-bold">Petugas Opname,</p>
                                    <div className="h-20" />
                                    <p className="font-bold underline">{user?.name}</p>
                                    <p>NIP. {user?.nip}</p>
                                </div>
                            </div>
                        ) : (
                             <div className="flex justify-between items-start">
                                <div className="text-center w-1/3">
                                    <p>Mengetahui,</p>
                                    <p className="font-bold">Kepala {uptdNameForReport}</p>
                                    <div className="mt-20 h-5" />
                                    <p className="font-bold underline">{settings.kepalaUPTD}</p>
                                    <p>NIP. {settings.nipKepalaUPTD}</p>
                                </div>
                                <div className="w-1/3"></div>
                                <div className="text-center w-1/3">
                                    <p>Kuningan, {format(new Date(), "dd MMMM yyyy", { locale: id })}</p>
                                    <p className="font-bold">Petugas Opname,</p>
                                    <div className="mt-20 h-5" />
                                    <p className="font-bold underline">{user?.name}</p>
                                    <p>NIP. {user?.nip}</p>
                                </div>
                            </div>
                        )}
                    </footer>
                </div>
            </CardContent>
        </Card>
      )}
       {loading && !generated && (
         <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-center">
                    <Skeleton className="h-48 w-full" />
                </div>
            </CardContent>
         </Card>
        )}
    </div>
    </>
  );
}
