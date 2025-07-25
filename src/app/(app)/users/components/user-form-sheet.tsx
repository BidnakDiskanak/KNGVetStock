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
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUserAction, updateUserAction } from "@/actions/user-actions"

const formSchema = z.object({
  name: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nip: z.string().optional(),
  email: z.string().email("Format email tidak valid"),
  password: z.string().optional(),
  role: z.enum(['admin', 'user']),
  location: z.string().min(3, "Lokasi/UPTD harus diisi"),
}).refine(data => {
    // If it's a new user (no id), password is required
    // @ts-ignore
    if (!data.id && (!data.password || data.password.length < 6)) {
      return false;
    }
    return true;
}, {
    message: "Password minimal 6 karakter dan wajib diisi untuk pengguna baru",
    path: ["password"],
});


type UserFormValues = z.infer<typeof formSchema>;

interface UserFormSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User | null;
}

export function UserFormSheet({ isOpen, setIsOpen, user }: UserFormSheetProps) {
  const { toast } = useToast();
  const isEditing = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nip: "",
      email: "",
      password: "",
      role: "user",
      location: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        ...user,
        password: "" // Do not populate password
      });
    } else {
      form.reset({
        name: "",
        nip: "",
        email: "",
        password: "",
        role: "user",
        location: "",
      });
    }
  }, [user, form, isOpen]);


  async function onSubmit(values: UserFormValues) {
    try {
      let result;
      if (isEditing && user) {
        result = await updateUserAction(user.id, values);
        if (result.success) {
            toast({
                title: "Data Diperbarui",
                description: "Data pengguna telah berhasil diperbarui.",
            });
        }
      } else {
        result = await createUserAction(values);
         if (result.success) {
            toast({
                title: "Pengguna Ditambahkan",
                description: "Pengguna baru telah berhasil ditambahkan.",
            });
        }
      }

      if (!result.success) {
         toast({
            title: isEditing ? "Gagal Memperbarui" : "Gagal Menambahkan",
            description: result.error,
            variant: "destructive",
        });
      } else {
        setIsOpen(false);
      }
      
    } catch (error) {
      console.error("Error saving user: ", error);
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan yang tidak diketahui.",
        variant: "destructive",
      });
    }
  }
  
  const isLoading = form.formState.isSubmitting;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Lakukan perubahan pada data pengguna.' : 'Isi formulir untuk menambahkan pengguna baru.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Budi Santoso" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP</FormLabel>
                  <FormControl>
                    <Input placeholder="NIP (opsional)" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contoh@uptd.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={isEditing ? 'Isi untuk mengubah' : 'Minimal 6 karakter'} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Peran</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih peran..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="user">User UPTD</SelectItem>
                            <SelectItem value="admin">Admin Dinas</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi / UPTD</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: UPTD PKH Kuningan" {...field} disabled={isLoading}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="outline" disabled={isLoading}>Batal</Button>
                </SheetClose>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
