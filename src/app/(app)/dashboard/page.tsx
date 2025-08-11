"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Archive, Box, PackageCheck } from "lucide-react";

import { useUser } from "@/contexts/UserProvider";
import type { User, DashboardStats, StockOpname } from "@/lib/types";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

export default function DashboardPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        let q;
        const stockOpnamesRef = collection(db, "stock-opnames");

        if (user.role === 'admin') {
            q = query(stockOpnamesRef, where('userRole', '==', 'admin'));
        } else {
            q = query(stockOpnamesRef, where('userId', '==', user.id));
        }

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allRecords: StockOpname[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const opnameDate = data.opnameDate?.toDate();
                const expireDate = data.expireDate?.toDate();

                if (opnameDate && !isNaN(opnameDate.getTime())) {
                    allRecords.push({
                        id: doc.id,
                        ...data,
                        opnameDate,
                        expireDate: expireDate && !isNaN(expireDate.getTime()) ? expireDate : undefined,
                    } as StockOpname);
                }
            });

            if (allRecords.length === 0) {
                setStats({ totalObat: 0, totalStok: 0, stokMenipis: 0, akanKadaluarsa: 0, obatStokMenipis: [], allMedicineStock: [], obatAkanKadaluarsa: [] });
                setLoading(false);
                return;
            }

            const recordsByMedicine: { [key: string]: StockOpname[] } = {};
            for (const record of allRecords) {
                if (!recordsByMedicine[record.medicineName]) {
                    recordsByMedicine[record.medicineName] = [];
                }
                recordsByMedicine[record.medicineName].push(record);
            }

            const latestRecords = Object.values(recordsByMedicine).map(records => {
                return records.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime())[0];
            });

            const finalData = latestRecords.filter(record => record.keadaanBulanLaporanJml > 0);
            
            const totalObat = finalData.length;
            const totalStok = finalData.reduce((sum, item) => sum + (item.keadaanBulanLaporanJml || 0), 0);
            
            const stokMenipisThreshold = 10;
            const obatStokMenipis = finalData.filter(item => item.keadaanBulanLaporanJml < stokMenipisThreshold);
            const stokMenipisCount = obatStokMenipis.length;

            const expiryThreshold = new Date();
            expiryThreshold.setMonth(expiryThreshold.getMonth() + 1);
            const akanKadaluarsaItems = finalData.filter(item => 
                item.expireDate && item.expireDate < expiryThreshold
            );
            const akanKadaluarsaCount = akanKadaluarsaItems.length;

            const newStats: DashboardStats = {
                totalObat,
                totalStok,
                stokMenipis: stokMenipisCount,
                akanKadaluarsa: akanKadaluarsaCount,
                obatStokMenipis: obatStokMenipis.map(item => ({
                    medicineName: item.medicineName,
                    sisaStok: item.keadaanBulanLaporanJml,
                    lokasi: item.userLocation || ''
                })),
                allMedicineStock: finalData.map(item => ({
                    name: item.medicineName,
                    value: item.keadaanBulanLaporanJml,
                })),
                obatAkanKadaluarsa: akanKadaluarsaItems.map(item => ({
                    medicineName: item.medicineName,
                    expireDate: format(item.expireDate!, "d LLL yyyy", { locale: id }),
                    lokasi: item.userLocation || ''
                }))
            };
            
            setStats(newStats);
            setLoading(false);

        }, (error) => {
            console.error("Gagal mengambil data dashboard secara real-time:", error);
            setLoading(false);
        });

        // Membersihkan listener saat komponen dilepas
        return () => unsubscribe();

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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Distribusi Stok per Jenis Obat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.allMedicineStock && stats.allMedicineStock.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={stats.allMedicineStock}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stats.allMedicineStock.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value} unit`, name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">
                                <p>Tidak ada data untuk ditampilkan di grafik.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-1">
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
            </div>
            
            <div className="grid grid-cols-1">
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