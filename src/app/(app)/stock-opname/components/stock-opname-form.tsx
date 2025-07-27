"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createStockOpnameAction } from "@/actions/stock-opname-actions";
import { Separator } from "@/components/ui/separator";

// Skema validasi untuk formulir yang lebih detail
const formSchema = z.object({
  opnameDate: z.date({ required_error: "Tanggal stock opname wajib diisi." }),
  medicineName: z.string().min(2, "Nama obat minimal 2 karakter."),
  jenisObat: z.string().optional(),
  satuan: z.string().optional(),
  expireDate: z.date().optional(),
  asalBarang: z.string().optional(),
  
  // Keadaan Bulan Lalu
  keadaanBulanLaluBaik: z.coerce.number().min(0).default(0),
  keadaanBulanLaluRusak: z.coerce.number().min(0).default(0),

  // Pemasukan
  pemasukanBaik: z.coerce.number().min(0).default(0),
  pemasukanRusak: z.coerce.number().min(0).default(0),

  // Pengeluaran
  pengeluaranBaik: z.coerce.number().min(0).default(0),
  pengeluaranRusak: z.coerce.number().min(0).default(0),

  keterangan: z.string().optional(),
});

export function StockOpnameForm() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await createStockOpnameAction(values);

    if (result.success) {
      toast({
        title: "Sukses",
        description: "Data stock opname berhasil disimpan.",
      });
      form.reset();
    } else {
      toast({
        title: "Gagal",
        description: result.error || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* --- Bagian Informasi Dasar --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="opnameDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Pencatatan</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="medicineName" render={({ field }) => (<FormItem><FormLabel>Nama Obat</FormLabel><FormControl><Input placeholder="Nama Obat" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="jenisObat" render={({ field }) => (<FormItem><FormLabel>Jenis Obat</FormLabel><FormControl><Input placeholder="Vaksin, Antibiotik, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="satuan" render={({ field }) => (<FormItem><FormLabel>Satuan</FormLabel><FormControl><Input placeholder="Botol, Strip, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        </div>
        
        <Separator />

        {/* --- Bagian Keadaan Bulan Lalu --- */}
        <div>
            <h3 className="text-lg font-medium">Keadaan Bulan Lalu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField control={form.control} name="keadaanBulanLaluBaik" render={({ field }) => (<FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="keadaanBulanLaluRusak" render={({ field }) => (<FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
        </div>

        {/* --- Bagian Pemasukan --- */}
        <div>
            <h3 className="text-lg font-medium">Pemasukan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField control={form.control} name="pemasukanBaik" render={({ field }) => (<FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="pemasukanRusak" render={({ field }) => (<FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
        </div>

        {/* --- Bagian Pengeluaran --- */}
        <div>
            <h3 className="text-lg font-medium">Pengeluaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField control={form.control} name="pengeluaranBaik" render={({ field }) => (<FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="pengeluaranRusak" render={({ field }) => (<FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
        </div>

        <Separator />

        {/* --- Bagian Informasi Tambahan --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="expireDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Kadaluarsa</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="asalBarang" render={({ field }) => (<FormItem><FormLabel>Asal Barang</FormLabel><FormControl><Input placeholder="Pusat, Provinsi, dll" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        </div>
        <FormField control={form.control} name="keterangan" render={({ field }) => (<FormItem><FormLabel>Keterangan</FormLabel><FormControl><Input placeholder="Catatan tambahan" {...field} /></FormControl><FormMessage /></FormItem>)}/>

        <Button type="submit">Simpan Data</Button>
      </form>
    </Form>
  );
}