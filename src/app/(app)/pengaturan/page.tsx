"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserProvider";
import { getOfficialsAction, updateOfficialsAction } from "@/actions/settings-actions";
// --- AKSI BARU UNTUK PROFIL PENGGUNA ---
import { updateUserProfileAction, changePasswordAction } from "@/actions/user-actions";
import type { User } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

// Skema untuk pengaturan umum (alamat & pejabat)
const settingsSchema = z.object({
    kepalaDinas: z.string().optional(),
    nipKepalaDinas: z.string().optional(),
    kepalaBidang: z.string().optional(),
    nipKepalaBidang: z.string().optional(),
    kepalaUPTD: z.string().optional(),
    nipKepalaUPTD: z.string().optional(),
    namaUPTD: z.string().optional(),
    jalan: z.string().optional(),
    desa: z.string().optional(),
    kecamatan: z.string().optional(),
    kabupaten: z.string().optional(),
});

// --- SKEMA BARU UNTUK PENGATURAN AKUN UPTD ---
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Nama minimal 2 karakter." }),
  nip: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, { message: "Password saat ini minimal 6 karakter." }),
  newPassword: z.string().min(6, { message: "Password baru minimal 6 karakter." }),
  confirmPassword: z.string().min(6, { message: "Konfirmasi password minimal 6 karakter." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi tidak cocok.",
  path: ["confirmPassword"],
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // Form untuk pengaturan umum
    const settingsForm = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {},
    });

    // --- FORM BARU UNTUK PENGATURAN AKUN UPTD ---
    const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

    const profileForm = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: { name: "", nip: "" },
    });

    const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    useEffect(() => {
        async function loadData() {
            if (user) {
                setLoading(true);
                // Memuat data pengaturan umum
                const result = await getOfficialsAction(user as User);
                if (result.success && result.data) {
                    settingsForm.reset(result.data);
                }
                // Memuat data profil pengguna untuk form akun
                profileForm.reset({ name: user.name || "", nip: user.nip || "" });
                setLoading(false);
            }
        }
        loadData();
    }, [user, settingsForm, profileForm]);

    // Handler untuk submit pengaturan umum
    async function onSettingsSubmit(values: SettingsFormValues) {
        if (!user) return;
        const result = await updateOfficialsAction(values, user as User);
        if (result.success) {
            toast({ title: "Sukses", description: "Pengaturan umum berhasil diperbarui." });
        } else {
            toast({ title: "Gagal", description: result.error, variant: "destructive" });
        }
    }

    // --- HANDLER BARU UNTUK SUBMIT PROFIL & PASSWORD ---
    async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
        if (!user) return;
        setIsProfileSubmitting(true);
        const result = await updateUserProfileAction(user.id, values);
        if (result.success) {
            toast({ title: "Sukses", description: "Profil Anda berhasil diperbarui." });
        } else {
            toast({ title: "Gagal", description: result.error, variant: "destructive" });
        }
        setIsProfileSubmitting(false);
    }

    async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
        setIsPasswordSubmitting(true);
        const result = await changePasswordAction(values.currentPassword, values.newPassword);
        if (result.success) {
            toast({ title: "Sukses", description: "Password Anda berhasil diubah." });
            passwordForm.reset();
        } else {
            toast({ title: "Gagal", description: result.error, variant: "destructive" });
        }
        setIsPasswordSubmitting(false);
    }

    if (loading) {
        return <Skeleton className="h-screen w-full p-2 md:p-8" />;
    }

    return (
        <div className="space-y-8 p-2 md:p-8">
            <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
            
            {/* --- FORM PENGATURAN UMUM (Alamat & Pejabat) --- */}
            <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Alamat</CardTitle>
                            <CardDescription>Alamat ini akan digunakan pada kop surat dan penanggalan laporan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={settingsForm.control} name="namaUPTD" render={({ field }) => (<FormItem><FormLabel>{user?.role === 'admin' ? 'Nama Dinas' : 'Nama UPTD'}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={settingsForm.control} name="jalan" render={({ field }) => (<FormItem><FormLabel>Jalan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={settingsForm.control} name="desa" render={({ field }) => (<FormItem><FormLabel>Desa/Kelurahan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={settingsForm.control} name="kecamatan" render={({ field }) => (<FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={settingsForm.control} name="kabupaten" render={({ field }) => (<FormItem><FormLabel>Kabupaten</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Pejabat Penanda Tangan</CardTitle>
                            <CardDescription>Data ini akan digunakan pada bagian tanda tangan di laporan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {user?.role === 'admin' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={settingsForm.control} name="kepalaDinas" render={({ field }) => (<FormItem><FormLabel>Nama Kepala Dinas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={settingsForm.control} name="nipKepalaDinas" render={({ field }) => (<FormItem><FormLabel>NIP Kepala Dinas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={settingsForm.control} name="kepalaBidang" render={({ field }) => (<FormItem><FormLabel>Nama Kepala Bidang</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={settingsForm.control} name="nipKepalaBidang" render={({ field }) => (<FormItem><FormLabel>NIP Kepala Bidang</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={settingsForm.control} name="kepalaUPTD" render={({ field }) => (<FormItem><FormLabel>Nama Kepala UPTD</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={settingsForm.control} name="nipKepalaUPTD" render={({ field }) => (<FormItem><FormLabel>NIP Kepala UPTD</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Button type="submit" disabled={settingsForm.formState.isSubmitting}>
                        {settingsForm.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan Umum'}
                    </Button>
                </form>
            </Form>

            {/* --- BAGIAN BARU: PENGATURAN AKUN KHUSUS UPTD --- */}
            {user?.role !== 'admin' && (
                <div className="space-y-8 pt-8">
                    <Separator />
                    <h3 className="text-2xl font-bold tracking-tight">Pengaturan Akun Operator</h3>
                    <Card>
                        <CardHeader>
                            <CardTitle>Profil Operator</CardTitle>
                            <CardDescription>Ubah nama dan NIP Anda yang terdaftar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                    <FormField control={profileForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama Operator</FormLabel><FormControl><Input placeholder="Nama lengkap" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={profileForm.control} name="nip" render={({ field }) => (<FormItem><FormLabel>NIP</FormLabel><FormControl><Input placeholder="NIP (jika ada)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="submit" disabled={isProfileSubmitting}>
                                        {isProfileSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Simpan Perubahan Profil
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Ubah Password</CardTitle>
                            <CardDescription>Pastikan Anda menggunakan password yang kuat.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Password Saat Ini</FormLabel><FormControl><Input type="password" placeholder="******" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>Password Baru</FormLabel><FormControl><Input type="password" placeholder="******" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Konfirmasi Password Baru</FormLabel><FormControl><Input type="password" placeholder="******" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="submit" disabled={isPasswordSubmitting}>
                                        {isPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Ubah Password
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
