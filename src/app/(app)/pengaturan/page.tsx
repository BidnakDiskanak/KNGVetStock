"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserProvider";
import { getOfficialsAction, updateOfficialsAction } from "@/actions/settings-actions";
import type { User, Officials } from "@/lib/types";

// Skema digabung untuk semua field
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

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {},
    });

    useEffect(() => {
        async function loadSettings() {
            if (user) {
                setLoading(true);
                const result = await getOfficialsAction(user as User);
                if (result.success && result.data) {
                    form.reset(result.data);
                }
                setLoading(false);
            }
        }
        loadSettings();
    }, [user, form]);

    async function onSubmit(values: SettingsFormValues) {
        if (!user) return;

        const result = await updateOfficialsAction(values, user as User);
        if (result.success) {
            toast({ title: "Sukses", description: "Pengaturan berhasil diperbarui." });
        } else {
            toast({ title: "Gagal", description: result.error, variant: "destructive" });
        }
    }

    if (loading) {
        return <Skeleton className="h-96 w-full p-2 md:p-8" />;
    }

    return (
        <div className="space-y-8 p-2 md:p-8">
            <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* --- KARTU ALAMAT --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Alamat</CardTitle>
                            <CardDescription>
                                Alamat ini akan digunakan pada kop surat dan penanggalan laporan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="namaUPTD" render={({ field }) => (<FormItem><FormLabel>{user?.role === 'admin' ? 'Nama Dinas' : 'Nama UPTD'}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="jalan" render={({ field }) => (<FormItem><FormLabel>Jalan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="desa" render={({ field }) => (<FormItem><FormLabel>Desa/Kelurahan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="kecamatan" render={({ field }) => (<FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="kabupaten" render={({ field }) => (<FormItem><FormLabel>Kabupaten</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- KARTU PEJABAT --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Pejabat Penanda Tangan</CardTitle>
                            <CardDescription>
                                Data ini akan digunakan pada bagian tanda tangan di laporan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {user?.role === 'admin' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="kepalaDinas" render={({ field }) => (<FormItem><FormLabel>Nama Kepala Dinas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="nipKepalaDinas" render={({ field }) => (<FormItem><FormLabel>NIP Kepala Dinas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="kepalaBidang" render={({ field }) => (<FormItem><FormLabel>Nama Kepala Bidang</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="nipKepalaBidang" render={({ field }) => (<FormItem><FormLabel>NIP Kepala Bidang</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="kepalaUPTD" render={({ field }) => (<FormItem><FormLabel>Nama Kepala UPTD</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="nipKepalaUPTD" render={({ field }) => (<FormItem><FormLabel>NIP Kepala UPTD</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
