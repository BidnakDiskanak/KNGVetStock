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
  medicineName: z.string().min(2, "Nama obat minimal 2 karakter."),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date({ required_error: "Tanggal kadaluarsa wajib diisi." }),
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
}

export function StockOpnameFormSheet({ isOpen, setIsOpen, opnameData }: StockOpnameFormSheetProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const isEditMode = !!opnameData;
  const [isFetchingLastStock, setIsFetchingLastStock] = useState(false);
  // --- PERBAIKAN 1: State untuk melacak notifikasi ---
  const [hasNotified, setHasNotified] = useState(false);

  const form = useForm<StockOpnameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const watchedFields = useWatch({ control: form.control });
  const debouncedMedicineName = useDebounce(watchedFields.medicineName, 500); // Jeda 500ms agar tidak terlalu sering
  const debouncedExpireDate = useDebounce(watchedFields.expireDate, 500);

  useEffect(() => {
    // --- PERBAIKAN 2: Logika pengecekan diubah ---
    // Pengecekan hanya berjalan jika:
    // 1. Bukan mode edit
    // 2. Nama obat dan tanggal ED sudah diisi (setelah debounce)
    // 3. Notifikasi untuk batch ini belum pernah muncul
    if (!isEditMode && debouncedMedicineName && debouncedExpireDate && user && !hasNotified) {
        const fetchLastStock = async () => {
            setIsFetchingLastStock(true);
            const result = await getLastStockAction(debouncedMedicineName, debouncedExpireDate!, user as User);
            if (result.success && result.data) {
                form.setValue('keadaanBulanLaluBaik', result.data.keadaanBulanLaporanBaik);
                form.setValue('keadaanBulanLaluRusak', result.data.keadaanBulanLaporanRusak);
                toast({
                    title: "Stok Bulan Lalu Ditemukan",
                    description: `Stok terakhir untuk ${debouncedMedicineName} berhasil dimuat.`,
                });
                // Tandai bahwa notifikasi sudah muncul agar tidak berulang
                setHasNotified(true); 
            } else {
                // Jika tidak ditemukan, pastikan stok bulan lalu kembali ke 0
                form.setValue('keadaanBulanLaluBaik', 0);
                form.setValue('keadaanBulanLaluRusak', 0);
            }
            setIsFetchingLastStock(false);
        };
        fetchLastStock();
    }
  }, [debouncedMedicineName, debouncedExpireDate, isEditMode, user, form, toast, hasNotified]);

  useEffect(() => {
    if (opnameData) {
        form.reset({
            ...opnameData,
            expireDate: opnameData.expireDate ? new Date(opnameData.expireDate) : undefined,
        });
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
    // --- PERBAIKAN 3: Reset status notifikasi saat form dibuka/di-reset ---
    setHasNotified(false);
  }, [opnameData, form, isOpen]);

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

    return {
        keadaanBulanLaluJml,
        pemasukanJml,
        pengeluaranJml,
        keadaanBulanLaporanBaik,
        keadaanBulanLaporanRusak,
        keadaanBulanLaporanJml
    };
  }, [watchedFields]);

  async function onSubmit(values: StockOpnameFormValues) {
    if (!user) {
        toast({ title: "Error", description: "Pengguna tidak ditemukan.", variant: "destructive" });
        return;
    }

    const action = isEditMode
      ? updateStockOpnameAction(opnameData!.id, values, user as User)
      : createStockOpnameAction(values, user as User);

    const result = await action;

    if (result.success) {
      toast({
        title: "Sukses",
        description: `Data stock opname berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}.`,
      });
      setIsOpen(false);
    } else {
      toast({
        title: "Gagal",
        description: result.error || "Terjadi kesalahan.",
        variant: "destructive",
      });
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{isEditMode ? 'Ubah Data Stock Opname' : 'Tambah Data Stock Opname'}</SheetTitle>
                <SheetDescription>
                    {isEditMode ? 'Ubah detail data di bawah ini.' : 'Isi nama obat dan tanggal kadaluarsa untuk memuat stok terakhir secara otomatis.'}
                </SheetDescription>
            </SheetHeader>
            <div className="py-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="opnameDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Tanggal Pencatatan</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="medicineName" render={({ field }) => (<FormItem><FormLabel>Nama Obat</FormLabel><FormControl><Input placeholder="Nama Obat" {...field} disabled={isEditMode} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="jenisObat" render={({ field }) => (<FormItem><FormLabel>Jenis Obat</FormLabel><FormControl><Input placeholder="Vaksin, Antibiotik, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="satuan" render={({ field }) => (<FormItem><FormLabel>Satuan</FormLabel><FormControl><Input placeholder="Botol, Strip, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <Separator />
                        
                        <div className="grid grid-cols-4 gap-x-4 gap-y-2 items-end">
                            <div className="font-medium">Kondisi</div>
                            <div className="font-medium text-center">Baik</div>
                            <div className="font-medium text-center">Rusak</div>
                            <div className="font-medium text-center text-blue-600">Jumlah</div>

                            <div className="font-medium flex items-center">
                                Keadaan Bulan Lalu
                                {isFetchingLastStock && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            </div>
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
                                <FormItem className="flex flex-col"><FormLabel>Tanggal Kadaluarsa</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isEditMode}>{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
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
