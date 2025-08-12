"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, Pill, AlertTriangle, CalendarClock } from 'lucide-react';

import { useUser } from '@/contexts/UserProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- KEMBALI MENGGUNAKAN PATH ALIAS ---
// Ini adalah cara yang benar. Masalahnya ada pada konfigurasi build, bukan pada path ini.
import { getDashboardStatsAction } from '@/actions/dashboard-action';
import { DataTable } from '@/app/(app)/dashboard/components/data-table-low-stock';
import { columns as lowStockColumns } from '@/app/(app)/dashboard/components/columns-low-stock';
import { columns as expiringColumns } from '@/app/(app)/dashboard/components/columns-expiring';
// --- AKHIR PERUBAHAN ---

import type { DashboardStats, User } from '@/lib/types';

export default function DashboardPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (user) {
                setLoading(true);
                const result = await getDashboardStatsAction(user as User);
                if (result.success && result.data) {
                    setStats(result.data);
                } else {
                    console.error("Gagal mengambil statistik dashboard:", result.error);
                }
                setLoading(false);
            }
        }
        fetchStats();
    }, [user]);

    if (loading) {
        return <div className="flex items-center justify-center h-full">Memuat data dashboard...</div>;
    }

    if (!stats) {
        return <div className="flex items-center justify-center h-full">Gagal memuat data.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Jenis Obat</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalObat}</div>
                        <p className="text-xs text-muted-foreground">Jumlah jenis obat yang terdaftar</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stok Keseluruhan</CardTitle>
                        <Pill className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStok.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground">Jumlah unit semua obat</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Obat Stok Menipis</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.stokMenipis}</div>
                        <p className="text-xs text-muted-foreground">Jenis obat dengan stok &lt; 50</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Akan Kadaluarsa (&lt;1 Bulan)</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.akanKadaluarsa.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground">Jumlah unit obat akan ED</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Distribusi Stok per Jenis Obat</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {stats.stockByJenisObat && stats.stockByJenisObat.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={stats.stockByJenisObat}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" fontSize={10} />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={100} 
                                        tick={{ fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ fontSize: '12px', padding: '5px' }}
                                        formatter={(value: number) => [value.toLocaleString('id-ID'), 'Jumlah Stok']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="value" name="Jumlah Stok" fill="#16a085" barSize={15} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[280px]">
                                <p className="text-sm text-muted-foreground">Tidak ada data distribusi stok.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Obat dengan Stok Terendah</CardTitle>
                    </Header>
                    <CardContent>
                         <DataTable columns={lowStockColumns} data={stats.obatStokMenipis} />
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Obat Akan Segera Kadaluarsa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={expiringColumns} data={stats.obatAkanKadaluarsa} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
