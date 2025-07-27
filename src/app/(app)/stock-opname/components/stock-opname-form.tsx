"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
// Anda perlu membuat file action ini
import { createStockOpnameAction } from "@/actions/stock-opname-actions"; 

// Skema validasi untuk formulir
const formSchema = z.object({
  medicineName: z.string().min(2, "Nama obat minimal 2 karakter."),
  quantity: z.coerce.number().min(0, "Jumlah tidak boleh negatif."),
  opnameDate: z.date({
    required_error: "Tanggal stock opname wajib diisi.",
  }),
});

export function StockOpnameForm() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineName: "",
      quantity: 0,
      opnameDate: new Date(), // Default ke tanggal hari ini
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Panggil server action untuk menyimpan data
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Field Nama Obat */}
        <FormField
          control={form.control}
          name="medicineName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Obat</FormLabel>
              <FormControl>
                <Input placeholder="Paracetamol" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Field Jumlah */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Stok</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Field Pemilih Tanggal (Date Picker) */}
        <FormField
          control={form.control}
          name="opnameDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tanggal Stock Opname</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: id })
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Simpan</Button>
      </form>
    </Form>
  );
}