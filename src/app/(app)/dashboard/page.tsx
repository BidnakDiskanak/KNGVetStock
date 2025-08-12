"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from "date-fns";
import { id } from "date-fns/locale";
// --- PERUBAHAN IMPOR RECHARTS ---
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Archive, Box, PackageCheck } from "lucide-react";

import { useUser } from "@/contexts/UserProvider";
// --- PERUBAHAN TIPE DATA ---
// Menambahkan stockByJenisObat ke tipe data
import type { User, StockOpname } from "@/lib/types";
interface DashboardStats {
    totalObat: number;
    totalStok: number;
    stokMenipis: number;
    akanKadaluarsa: number;
    obatStokMenipis: { medicineName: string; sisaStok: number; lokasi: string; }[];
    obatAkanKadaluarsa: { medicineName: string; expireDate: string; lokasi: string; }[];
    stockByJenisObat: { name: string; value: number; }[];
}


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
                setStats({ totalObat: 0, totalStok: 0, stokMenipis: 0, akanKadaluarsa: 0, obatStokMenipis: [], obatAkanKadaluarsa: [], stockByJenisObat: [] });
                setLoading(false);
                return;
            }

            const recordsByBatch: { [key: string]: StockOpname[] } = {};
            for (const record of allRecords) {
                const expireDateString = record.expireDate ? record.expireDate.toISOString() : 'no-expiry';
                const key = `${record.medicineName}|${expireDateString}`;
                if (!recordsByBatch[key]) {
                    recordsByBatch[key] = [];
                }
                recordsByBatch[key].push(record);
            }

            const latestBatchRecords = Object.values(recordsByBatch).map(records => {
                return records.sort((a, b) => b.opnameDate.getTime() - a.opnameDate.getTime())[0];
            });

            const finalData = latestBatchRecords.filter(record => record.keadaanBulanLaporanJml > 0);
            
            const totalObat = new Set(finalData.map(item => item.medicineName)).size;
            const totalStok = finalData.reduce((sum, item) => sum + (item.keadaanBulanLaporanJml || 0), 0);
            
            const stokMenipisThreshold = 50; // Sesuai dengan action sebelumnya
            const obatStokMenipis = finalData.filter(item => item.keadaanBulanLaporanJml < stokMenipisThreshold);
            const stokMenipisCount = obatStokMenipis.length;

            const expiryThreshold = new Date();
            expiryThreshold.setMonth(expiryThreshold.getMonth() + 1);
            const akanKadaluarsaItems = finalData.filter(item => 
                item.expireDate && item.expireDate < expiryThreshold
            );
            const akanKadaluarsaCount = akanKadaluarsaItems.length;

            const stockByJenis: { [key: string]: number } = {};
            finalData.forEach(item => {
                const jenis = item.jenisObat || 'Lainnya';
                if (!stockByJenis[jenis]) {
                    stockByJenis[jenis] = 0;
                }
                stockByJenis[jenis] += item.keadaanBulanLaporanJml;
            });

            const stockByJenisObat = Object.entries(stockByJenis).map(([name, value]) => ({
                name,
                value
            })).sort((a, b) => b.value - a.value); // Mengurutkan dari terbesar ke terkecil
            
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
                stockByJenisObat, 
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
                        <div className="text-2xl font-bold">{stats?.totalStok.toLocaleString('id-ID') ?? 0}</div>
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

            {/* --- PERUBAHAN TATA LETAK --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <Card className="lg:col-span-1">
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
            
            <div className="grid grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribusi Stok per Jenis Obat</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-0">
                        {stats?.stockByJenisObat && stats.stockByJenisObat.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    data={stats.stockByJenisObat}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 50 }} // Menambah margin bawah
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 10 }}
                                        angle={-45} // Memiringkan label
                                        textAnchor="end" // Mengatur posisi anchor
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ fontSize: '12px', padding: '5px' }}
                                        formatter={(value: number) => [value.toLocaleString('id-ID'), 'Jumlah Stok']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="value" name="Jumlah Stok" fill="#16a085" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[350px] items-center justify-center text-center text-muted-foreground">
                                <p>Tidak ada data untuk ditampilkan di grafik.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}