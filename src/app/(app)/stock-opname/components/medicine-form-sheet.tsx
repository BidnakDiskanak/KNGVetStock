"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore"
import type { Medicine } from "@/lib/types"
import { useUser } from "@/contexts/UserProvider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  name: z.string().min(3, "Nama obat minimal 3 karakter"),
  type: z.enum(['Vaksin', 'Antibiotik', 'Vitamin', 'Analgesik', 'Kemoterapeutik', 'Antipiretik', 'Antiinflamasi', 'Anti Radang', 'Antihistamin', 'Antimikroba', 'Obat Kembung', 'Desinfektan', 'Antiseptik', 'Obat Cacing', 'Salep Mata', 'Lainnya']),
  unit: z.enum(['Botol', 'Strip', 'Box', 'Vial']),
  
  prev_baik: z.coerce.number().min(0, "Stok tidak boleh minus"),
  prev_rusak: z.coerce.number().min(0, "Stok tidak boleh minus"),
  pemasukan_baik: z.coerce.number().min(0, "Pemasukan tidak boleh minus"),
  pemasukan_rusak: z.coerce.number().min(0, "Pemasukan tidak boleh minus"),
  pengeluaran_baik: z.coerce.number().min(0, "Pengeluaran tidak boleh minus"),
  pengeluaran_rusak: z.coerce.number().min(0, "Pengeluaran tidak boleh minus"),
  
  notes: z.string().optional(),
  expiryDate: z.date({ required_error: "Tanggal kadaluarsa harus diisi" }),
  location: z.enum(['dinas', 'uptd']),
  userId: z.string(),
});

type MedicineFormValues = z.infer<typeof formSchema>;

interface MedicineFormSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  medicine: Medicine | null;
}

export function MedicineFormSheet({ isOpen, setIsOpen, medicine }: MedicineFormSheetProps) {
  const { toast } = useToast();
  const { user } = useUser();

  const defaultFormValues: MedicineFormValues = {
      name: "",
      type: "Antibiotik",
      unit: "Botol",
      prev_baik: 0,
      prev_rusak: 0,
      pemasukan_baik: 0,
      pemasukan_rusak: 0,
      pengeluaran_baik: 0,
      pengeluaran_rusak: 0,
      notes: "",
      expiryDate: new Date(),
      location: user?.role === 'admin' ? 'dinas' : 'uptd',
      userId: user?.id || '',
  }

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });
  
  const watchedValues = form.watch();

  const isEditing = !!medicine;

  useEffect(() => {
    if (medicine) {
      form.reset({
        ...medicine,
        expiryDate: medicine.expiryDate instanceof Date ? medicine.expiryDate : medicine.expiryDate.toDate(),
      });
    } else {
       if (user) {
        // Set default values based on user role when adding new medicine
        form.reset({
            ...defaultFormValues,
            location: user.role === 'admin' ? 'dinas' : 'uptd',
            userId: user.id,
        });
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicine, form, isOpen, user]);


  async function onSubmit(values: MedicineFormValues) {
    if (!user) {
      toast({ title: "Error", description: "Anda harus login untuk menyimpan data.", variant: "destructive" });
      return;
    }

    const sisa_baik = (values.prev_baik + values.pemasukan_baik) - values.pengeluaran_baik;
    const sisa_rusak = (values.prev_rusak + values.pemasukan_rusak) - values.pengeluaran_rusak;

    const dataToSave = {
      ...values,
      sisa_baik,
      sisa_rusak,
      userId: user.id, // Ensure userId is set
      dateAdded: serverTimestamp(),
    };
    
    try {
      if (isEditing && medicine) {
        const docRef = doc(db, "medicines", medicine.id);
        await setDoc(docRef, dataToSave, { merge: true });
        toast({ title: "Data Diperbarui", description: "Data obat telah berhasil diperbarui." });
      } else {
        await addDoc(collection(db, "medicines"), dataToSave);
        toast({ title: "Data Ditambahkan", description: "Obat baru telah berhasil ditambahkan." });
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving medicine: ", error);
      toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan data.", variant: "destructive" });
    }
  }

  const {
      prev_baik, prev_rusak, pemasukan_baik, pemasukan_rusak,
      pengeluaran_baik, pengeluaran_rusak
  } = watchedValues;

  // Ensure all calculations are done with numbers
  const num_prev_baik = Number(prev_baik) || 0;
  const num_prev_rusak = Number(prev_rusak) || 0;
  const num_pemasukan_baik = Number(pemasukan_baik) || 0;
  const num_pemasukan_rusak = Number(pemasukan_rusak) || 0;
  const num_pengeluaran_baik = Number(pengeluaran_baik) || 0;
  const num_pengeluaran_rusak = Number(pengeluaran_rusak) || 0;

  const prev_jml = num_prev_baik + num_prev_rusak;
  const pemasukan_jml = num_pemasukan_baik + num_pemasukan_rusak;
  const pengeluaran_jml = num_pengeluaran_baik + num_pengeluaran_rusak;
  const sisa_baik = (num_prev_baik + num_pemasukan_baik) - num_pengeluaran_baik;
  const sisa_rusak = (num_prev_rusak + num_pemasukan_rusak) - num_pengeluaran_rusak;
  const sisa_jml = sisa_baik + sisa_rusak;


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Ubah Data Obat' : 'Tambah Data Obat Baru'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Lakukan perubahan pada data obat.' : 'Isi formulir untuk menambahkan data obat baru ke dalam sistem.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* --- Bagian Informasi Dasar --- */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nama Obat</FormLabel>
                            <FormControl>
                                <Input placeholder="Contoh: Amoxicillin 250mg" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Jenis Obat</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Vaksin">Vaksin</SelectItem>
                                        <SelectItem value="Antibiotik">Antibiotik</SelectItem>
                                        <SelectItem value="Vitamin">Vitamin</SelectItem>
                                        <SelectItem value="Analgesik">Analgesik</SelectItem>
                                        <SelectItem value="Kemoterapeutik">Kemoterapeutik</SelectItem>
                                        <SelectItem value="Antipiretik">Antipiretik</SelectItem>
                                        <SelectItem value="Antiinflamasi">Antiinflamasi</SelectItem>
                                        <SelectItem value="Anti Radang">Anti Radang</SelectItem>
                                        <SelectItem value="Antihistamin">Antihistamin</SelectItem>
                                        <SelectItem value="Antimikroba">Antimikroba</SelectItem>
                                        <SelectItem value="Obat Kembung">Obat Kembung</SelectItem>
                                        <SelectItem value="Desinfektan">Desinfektan</SelectItem>
                                        <SelectItem value="Antiseptik">Antiseptik</SelectItem>
                                        <SelectItem value="Obat Cacing">Obat Cacing</SelectItem>
                                        <SelectItem value="Salep Mata">Salep Mata</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="unit" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Satuan</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih satuan..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Botol">Botol</SelectItem>
                                        <SelectItem value="Strip">Strip</SelectItem>
                                        <SelectItem value="Box">Box</SelectItem>
                                        <SelectItem value="Vial">Vial</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem> )} />
                        </div>
                </CardContent>
            </Card>

            {/* --- Bagian Stok --- */}
            <div className="space-y-4">
                <div className="text-center">
                    <h3 className="text-lg font-medium">Data Stok</h3>
                    <p className="text-sm text-muted-foreground">Isi data stok sesuai kondisi.</p>
                </div>
                
                {/* Keadaan Bulan Lalu */}
                <Card className="bg-muted/30">
                    <CardHeader className="py-3"><CardTitle className="text-base">Keadaan Bulan Lalu</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                         <FormField control={form.control} name="prev_baik" render={({ field }) => (
                             <FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="prev_rusak" render={({ field }) => (
                            <FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" value={prev_jml} disabled className="font-bold" /></FormControl></FormItem>
                    </CardContent>
                </Card>

                {/* Pemasukan */}
                 <Card className="bg-muted/30">
                    <CardHeader className="py-3"><CardTitle className="text-base">Pemasukan</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                         <FormField control={form.control} name="pemasukan_baik" render={({ field }) => (
                             <FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="pemasukan_rusak" render={({ field }) => (
                            <FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" value={pemasukan_jml} disabled className="font-bold" /></FormControl></FormItem>
                    </CardContent>
                </Card>

                {/* Pengeluaran */}
                 <Card className="bg-muted/30">
                    <CardHeader className="py-3"><CardTitle className="text-base">Pengeluaran</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                         <FormField control={form.control} name="pengeluaran_baik" render={({ field }) => (
                             <FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="pengeluaran_rusak" render={({ field }) => (
                            <FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" value={pengeluaran_jml} disabled className="font-bold" /></FormControl></FormItem>
                    </CardContent>
                </Card>

                {/* Sisa Stok */}
                <Card>
                    <CardHeader className="py-3"><CardTitle className="text-base text-primary">Keadaan s/d Bulan Laporan (Sisa Stok)</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                        <FormItem><FormLabel>Baik</FormLabel><FormControl><Input type="number" value={sisa_baik} disabled className="font-bold text-primary" /></FormControl></FormItem>
                        <FormItem><FormLabel>Rusak</FormLabel><FormControl><Input type="number" value={sisa_rusak} disabled className="font-bold text-destructive" /></FormControl></FormItem>
                        <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" value={sisa_jml} disabled className="font-bold" /></FormControl></FormItem>
                    </CardContent>
                </Card>
            </div>

            {/* --- Bagian Lain-lain --- */}
            <Card>
                 <CardContent className="pt-6 space-y-4">
                    <FormField control={form.control} name="expiryDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Kadaluarsa</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? ( format(field.value, "PPP", { locale: id }) ) : ( <span>Pilih tanggal</span> )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                </PopoverContent>
                            </Popover><FormMessage /></FormItem> )}
                    />
                     <FormItem>
                        <FormLabel>Nama Lokasi</FormLabel>
                        <FormControl>
                            <Input value={user?.location || 'Tidak diketahui'} disabled />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Keterangan</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Catatan tambahan..."
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 </CardContent>
            </Card>

            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="outline">Batal</Button>
                </SheetClose>
                <Button type="submit">Simpan</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
