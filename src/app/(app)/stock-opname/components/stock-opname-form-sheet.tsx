"use client";

import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createStockOpnameAction, updateStockOpnameAction, getLastStockAction } from "@/actions/stock-opname-actions";
import type { StockOpname, User } from "@/lib/types";
import { useUser } from "@/contexts/UserProvider";
import { useDebounce } from "@/hooks/use-debounce";

const formSchema = z.object({
  opnameDate: z.date({ required_error: "Tanggal stock opname wajib diisi." }),
  medicineName: z.string().min(2, "Nama barang minimal 2 karakter."),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional(),
  asalBarang: z.string().optional(),
  keadaanBulanLaluBaik: z.coerce.number().min(0).default(0),
  keadaanBulanLaluRusak: z.coerce.number().min(0).default(0),
  pemasukanBaik: z.coerce.number().min(0).default(0),
  pemasukanRusak: z.coerce.number().min(0).default(0),
  pengeluaranBaik: z.coerce.number().min(0).default(0),
  pengeluaranRusak: z.coerce.number().min(0).default(0),
  keterangan: z.string().optional(),
});

type StockOpnameFormValues = z.infer<typeof formSchema>;

interface StockOpnameFormSheetProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    opnameData: StockOpname | null;
    // --- FITUR BARU: Prop untuk melanjutkan data lama ---
    continueData?: StockOpname | null;
}

export function StockOpnameFormSheet({ isOpen, setIsOpen, opnameData, continueData }: StockOpnameFormSheetProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const isEditMode = !!opnameData;
  const [isFetchingLastStock, setIsFetchingLastStock] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);

  const form = useForm<StockOpnameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const watchedFields = useWatch({ control: form.control });
  const debouncedMedicineName = useDebounce(watchedFields.medicineName, 500);

  useEffect(() => {
    if (!isEditMode && debouncedMedicineName && user) {
      const fetchLastStock = async () => {
        setIsFetchingLastStock(true);
        const result = await getLastStockAction(
          debouncedMedicineName,
          watchedFields.expireDate,
          user as User
        );

        if (result.success && result.data) {
          form.setValue('keadaanBulanLaluBaik', result.data.keadaanBulanLaporanBaik);
          form.setValue('keadaanBulanLaluRusak', result.data.keadaanBulanLaporanRusak);
          if (!hasNotified) {
            toast({
              title: "Stok Bulan Lalu Ditemukan",
              description: `Stok terakhir untuk ${debouncedMedicineName} berhasil dimuat.`,
            });
            setHasNotified(true);
          }
        } else {
          form.setValue('keadaanBulanLaluBaik', 0);
          form.setValue('keadaanBulanLaluRusak', 0);
        }
        setIsFetchingLastStock(false);
      };

      if (debouncedMedicineName.length >= 2) {
        fetchLastStock();
      }
    }
  }, [debouncedMedicineName, watchedFields.expireDate, isEditMode, user, form, toast, hasNotified]);
  
  const medicineNameWatcher = form.watch("medicineName");
  useEffect(() => {
    setHasNotified(false);
  }, [medicineNameWatcher]);

  // --- PERBAIKAN: Logika reset form diubah untuk menangani "Lanjutkan Pencatatan" ---
  useEffect(() => {
    // Mode 1: Edit data yang sudah ada
    if (opnameData) {
        form.reset({
            ...opnameData,
            expireDate: opnameData.expireDate ? new Date(opnameData.expireDate) : undefined,
        });
    // Mode 2: Lanjutkan pencatatan dari data bulan lalu
    } else if (continueData) {
        form.reset({
            opnameDate: new Date(), // Tanggal hari ini
            medicineName: continueData.medicineName,
            jenisObat: continueData.jenisObat,
            satuan: continueData.satuan,
            expireDate: continueData.expireDate ? new Date(continueData.expireDate) : undefined,
            asalBarang: continueData.asalBarang,
            // Mengambil stok akhir bulan lalu menjadi stok awal bulan ini
            keadaanBulanLaluBaik: continueData.keadaanBulanLaporanBaik,
            keadaanBulanLaluRusak: continueData.keadaanBulanLaporanRusak,
            // Reset pemasukan dan pengeluaran
            pemasukanBaik: 0,
            pemasukanRusak: 0,
            pengeluaranBaik: 0,
            pengeluaranRusak: 0,
            keterangan: "",
        });
    // Mode 3: Tambah data baru dari awal
    } else {
        form.reset({
            opnameDate: new Date(),
            medicineName: "",
            jenisObat: "",
            satuan: "",
            asalBarang: "",
            keadaanBulanLaluBaik: 0,
            keadaanBulanLaluRusak: 0,
            pemasukanBaik: 0,
            pemasukanRusak: 0,
            pengeluaranBaik: 0,
            pengeluaranRusak: 0,
            keterangan: "",
            expireDate: undefined,
        });
    }
    setHasNotified(false);
  }, [opnameData, continueData, form, isOpen]);

  const calculations = useMemo(() => {
    const keadaanBulanLaluBaik = Number(watchedFields.keadaanBulanLaluBaik) || 0;
    const keadaanBulanLaluRusak = Number(watchedFields.keadaanBulanLaluRusak) || 0;
    const pemasukanBaik = Number(watchedFields.pemasukanBaik) || 0;
    const pemasukanRusak = Number(watchedFields.pemasukanRusak) || 0;
    const pengeluaranBaik = Number(watchedFields.pengeluaranBaik) || 0;
    const pengeluaranRusak = Number(watchedFields.pengeluaranRusak) || 0;
    const keadaanBulanLaluJml = keadaanBulanLaluBaik + keadaanBulanLaluRusak;
    const pemasukanJml = pemasukanBaik + pemasukanRusak;
    const pengeluaranJml = pengeluaranBaik + pengeluaranRusak;
    const keadaanBulanLaporanBaik = keadaanBulanLaluBaik + pemasukanBaik - pengeluaranBaik;
    const keadaanBulanLaporanRusak = keadaanBulanLaluRusak + pemasukanRusak - pengeluaranRusak;
    const keadaanBulanLaporanJml = keadaanBulanLaporanBaik + keadaanBulanLaporanRusak;
    return { keadaanBulanLaluJml, pemasukanJml, pengeluaranJml, keadaanBulanLaporanBaik, keadaanBulanLaporanRusak, keadaanBulanLaporanJml };
  }, [watchedFields]);

  async function onSubmit(values: StockOpnameFormValues) {
    if (!user) {
        toast({ title: "Error", description: "Pengguna tidak ditemukan.", variant: "destructive" });
        return;
    }
    // Logika simpan tetap sama, "Lanjutkan" dianggap sebagai "Tambah Data Baru"
    const action = isEditMode
      ? updateStockOpnameAction(opnameData!.id, values, user as User)
      : createStockOpnameAction(values, user as User);
    const result = await action;
    if (result.success) {
      toast({ title: "Sukses", description: `Data stock opname berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}.` });
      setIsOpen(false);
    } else {
      toast({ title: "Gagal", description: result.error || "Terjadi kesalahan.", variant: "destructive" });
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{isEditMode ? 'Ubah Data Stock Opname' : 'Tambah Data Stock Opname'}</SheetTitle>
                <SheetDescription>
                    {isEditMode ? 'Ubah detail data di bawah ini.' : 'Isi nama barang dan tanggal kadaluarsa (jika ada) untuk memuat stok terakhir.'}
                </SheetDescription>
            </SheetHeader>
            <div className="py-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* ... (Isi form lainnya tetap sama) ... */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="opnameDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Tanggal Pencatatan</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="medicineName" render={({ field }) => (<FormItem><FormLabel>Nama Barang</FormLabel><FormControl><Input placeholder="Nama Obat / Barang" {...field} disabled={isEditMode || !!continueData} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="jenisObat" render={({ field }) => (<FormItem><FormLabel>Jenis Barang</FormLabel><FormControl><Input placeholder="Vaksin, Alkes, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="satuan" render={({ field }) => (<FormItem><FormLabel>Satuan</FormLabel><FormControl><Input placeholder="Botol, Pcs, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-4 gap-x-4 gap-y-2 items-end">
                            <div className="font-medium">Kondisi</div>
                            <div className="font-medium text-center">Baik</div>
                            <div className="font-medium text-center">Rusak</div>
                            <div className="font-medium text-center text-blue-600">Jumlah</div>
                            <div className="font-medium flex items-center"> Keadaan Bulan Lalu {isFetchingLastStock && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} </div>
                            <FormField control={form.control} name="keadaanBulanLaluBaik" render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} className="text-center" readOnly /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="keadaanBulanLaluRusak" render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} className="text-center" readOnly /></FormControl></FormItem>)}/>
                            <Input type="number" value={calculations.keadaanBulanLaluJml} className="text-center font-bold text-blue-600" readOnly />
                            <div className="font-medium">Pemasukan</div>
                            <FormField control={form.control} name="pemasukanBaik" render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} className="text-center" /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="pemasukanRusak" render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} className="text-center" /></FormControl></FormItem>)}/>
                            <Input type="number" value={calculations.pemasukanJml} className="text-center font-bold text-blue-600" readOnly />
                            <div className="font-medium">Pengeluaran</div>
                            <FormField control={form.control} name="pengeluaranBaik" render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} className="text-center" /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="pengeluaranRusak" render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} className="text-center" /></FormControl></FormItem>)}/>
                            <Input type="number" value={calculations.pengeluaranJml} className="text-center font-bold text-blue-600" readOnly />
                            <div className="col-span-4"><Separator className="my-2"/></div>
                            <div className="font-medium text-green-600">Keadaan s/d Bulan Laporan</div>
                            <Input type="number" value={calculations.keadaanBulanLaporanBaik} className="text-center font-bold text-green-600" readOnly />
                            <Input type="number" value={calculations.keadaanBulanLaporanRusak} className="text-center font-bold text-green-600" readOnly />
                            <Input type="number" value={calculations.keadaanBulanLaporanJml} className="text-center font-bold text-green-600" readOnly />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="expireDate" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Tanggal Kadaluarsa</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isEditMode || !!continueData}>
                                                    {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} initialFocus /></PopoverContent>
                                    </Popover>
                                    <FormDescription>Kosongkan jika barang tidak memiliki tanggal kadaluarsa.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="asalBarang" render={({ field }) => (<FormItem><FormLabel>Asal Barang</FormLabel><FormControl><Input placeholder="Pusat, Provinsi, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="keterangan" render={({ field }) => (<FormItem><FormLabel>Keterangan</FormLabel><FormControl><Input placeholder="Catatan tambahan" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <Button type="submit" disabled={form.formState.isSubmitting || isFetchingLastStock}>
                            {isFetchingLastStock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                        </Button>
                    </form>
                </Form>
            </div>
        </SheetContent>
    </Sheet>
  );
}
