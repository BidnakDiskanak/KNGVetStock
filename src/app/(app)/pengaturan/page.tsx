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
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserProvider";
import { getOfficialsAction, updateOfficialsAction } from "@/actions/settings-actions";
import type { User, Officials } from "@/lib/types";

const formSchema = z.object({
    kepalaDinas: z.string().optional(),
    nipKepalaDinas: z.string().optional(),
    kepalaBidang: z.string().optional(),
    nipKepalaBidang: z.string().optional(),
    kepalaUPTD: z.string().optional(),
    nipKepalaUPTD: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(formSchema),
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
            toast({ title: "Sukses", description: "Data pejabat berhasil diperbarui." });
        } else {
            toast({ title: "Gagal", description: result.error, variant: "destructive" });
        }
    }

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="space-y-8 p-2 md:p-8">
            <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Data Pejabat Penanda Tangan</CardTitle>
                    <CardDescription>
                        Data ini akan digunakan pada saat mencetak laporan.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {user?.role === 'admin' ? (
                                <>
                                    {/* Form untuk Admin Dinas */}
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
                                <>
                                    {/* Form untuk User UPTD */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="kepalaUPTD" render={({ field }) => (<FormItem><FormLabel>Nama Kepala UPTD</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="nipKepalaUPTD" render={({ field }) => (<FormItem><FormLabel>NIP Kepala UPTD</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </>
                            )}
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}