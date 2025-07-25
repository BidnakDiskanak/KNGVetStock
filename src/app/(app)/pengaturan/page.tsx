"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/UserProvider';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function PengaturanPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [settings, setSettings] = useState<AppSettings>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, "settings", "app");
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as AppSettings);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: value }));
    }

    const handleSave = async () => {
        const docRef = doc(db, "settings", "app");
        try {
            await setDoc(docRef, settings, { merge: true });
            toast({
                title: "Pengaturan Disimpan",
                description: "Perubahan telah berhasil disimpan.",
            });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan pengaturan.",
                variant: "destructive",
            });
        }
    }

    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-full max-w-md" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
            </div>
        )
    }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Pengaturan Aplikasi</h1>
      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="pejabat">Pejabat</TabsTrigger>
        </TabsList>
        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle>Profil {user?.role === 'admin' ? 'Dinas' : 'UPTD'}</CardTitle>
              <CardDescription>
                Atur informasi dasar mengenai lokasi Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {user?.role === 'admin' ? (
                 <div className="space-y-2">
                    <Label htmlFor="dinasName">Nama Dinas</Label>
                    <Input id="dinasName" value={settings?.dinasName || ''} onChange={handleInputChange} />
                </div>
               ): (
                <div className="space-y-2">
                    <Label htmlFor="uptdName">Nama UPTD PKH</Label>
                    <Input id="uptdName" value={user?.location || settings?.uptdName || ''} onChange={handleInputChange} />
                </div>
               )}
                <div className="space-y-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Input id="address" value={settings?.address || ''} onChange={handleInputChange} />
                </div>
                 <Button onClick={handleSave}>Simpan Perubahan</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pejabat">
          <Card>
            <CardHeader>
              <CardTitle>Pejabat Penandatangan</CardTitle>
              <CardDescription>
                Atur nama dan NIP pejabat yang akan menandatangani laporan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.role === 'admin' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="kepalaDinas">Nama Kepala Dinas</Label>
                    <Input id="kepalaDinas" value={settings?.kepalaDinas || ''} onChange={handleInputChange} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="nipKepalaDinas">NIP Kepala Dinas</Label>
                    <Input id="nipKepalaDinas" value={settings?.nipKepalaDinas || ''} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kepalaBidang">Nama Kepala Bidang Peternakan</Label>
                    <Input id="kepalaBidang" value={settings?.kepalaBidang || ''} onChange={handleInputChange} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="nipKepalaBidang">NIP Kepala Bidang Peternakan</Label>
                    <Input id="nipKepalaBidang" value={settings?.nipKepalaBidang || ''} onChange={handleInputChange} />
                  </div>
                </>
              ) : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="kepalaUPTD">Nama Kepala UPTD PKH</Label>
                        <Input id="kepalaUPTD" value={settings?.kepalaUPTD || ''} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="nipKepalaUPTD">NIP Kepala UPTD PKH</Label>
                        <Input id="nipKepalaUPTD" value={settings?.nipKepalaUPTD || ''} onChange={handleInputChange} />
                    </div>
                </>
              )}
               <Button onClick={handleSave}>Simpan Perubahan</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
