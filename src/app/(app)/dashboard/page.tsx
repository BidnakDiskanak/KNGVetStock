"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Archive, Box, PackageCheck } from "lucide-react";

import { useUser } from "@/contexts/UserProvider";
import { getDashboardStatsAction } from "@/actions/dashboard-actions";
import type { User, DashboardStats } from "@/lib/types";

export default function DashboardPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (user) {
                const result = await getDashboardStatsAction(user as User);
                if (result.success && result.data) {
                    setStats(result.data);
                }
                setLoading(false);
            }
        }
        if (user) {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-8 p-2 md:p-8">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-2 md:p-8">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard {user?.role === 'admin' ? 'Dinas' : user?.location}</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Jenis Obat</CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalObat ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stok Keseluruhan</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalStok ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Obat Stok Menipis</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{stats?.stokMenipis ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Akan Kadaluarsa (&lt;1 Bulan)</CardTitle>
                        <PackageCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{stats?.akanKadaluarsa ?? 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Obat dengan Stok Terendah</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Obat</TableHead>
                                    {user?.role === 'admin' && <TableHead>Lokasi</TableHead>}
                                    <TableHead className="text-right">Sisa Stok</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.obatStokMenipis && stats.obatStokMenipis.length > 0 ? (
                                    stats.obatStokMenipis.slice(0, 5).map((item, index) => (
                                        <TableRow key={`low-stock-${index}`}>
                                            <TableCell>{item.medicineName}</TableCell>
                                            {user?.role === 'admin' && <TableCell>{item.lokasi}</TableCell>}
                                            <TableCell className="text-right">{item.sisaStok}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={user?.role === 'admin' ? 3 : 2} className="h-24 text-center">
                                            Tidak ada obat dengan stok menipis.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                {/* --- KARTU BARU UNTUK OBAT AKAN KADALUARSA --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Obat Akan Segera Kadaluarsa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Obat</TableHead>
                                    {user?.role === 'admin' && <TableHead>Lokasi</TableHead>}
                                    <TableHead className="text-right">Tgl. Kadaluarsa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.obatAkanKadaluarsa && stats.obatAkanKadaluarsa.length > 0 ? (
                                    stats.obatAkanKadaluarsa.slice(0, 5).map((item, index) => (
                                        <TableRow key={`expiring-${index}`}>
                                            <TableCell>{item.medicineName}</TableCell>
                                            {user?.role === 'admin' && <TableCell>{item.lokasi}</TableCell>}
                                            <TableCell className="text-right text-red-500 font-medium">{item.expireDate}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={user?.role === 'admin' ? 3 : 2} className="h-24 text-center">
                                            Tidak ada obat yang akan segera kadaluarsa.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}