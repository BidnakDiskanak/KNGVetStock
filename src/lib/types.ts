import { Timestamp } from "firebase/firestore";

export type Medicine = {
  id: string;
  name: string;
  type: 'Vaksin' | 'Antibiotik' | 'Vitamin' | 'Analgesik' | 'Kemoterapeutik' | 'Antipiretik' | 'Antiinflamasi' | 'Anti Radang' | 'Antihistamin' | 'Antimikroba' | 'Obat Kembung' | 'Desinfektan' | 'Antiseptik' | 'Obat Cacing' | 'Salep Mata' | 'Lainnya';
  unit: 'Botol' | 'Strip' | 'Box' | 'Vial';
  
  // Keadaan Bulan Lalu
  prev_baik: number;
  prev_rusak: number;

  // Pemasukan
  pemasukan_baik: number;
  pemasukan_rusak: number;

  // Pengeluaran
  pengeluaran_baik: number;
  pengeluaran_rusak: number;

  // Sisa Stok (dihitung)
  sisa_baik: number;
  sisa_rusak: number;
  
  notes: string;
  expiryDate: Date | Timestamp;
  location: 'dinas' | 'uptd';
  dateAdded?: Date | Timestamp;
  userId: string; // To link to the user who created it
  locationName?: string; // This will be populated at runtime for display
};

export type User = {
  id: string;
  name: string;
  nip?: string;
  email: string;
  role: 'admin' | 'user';
  location: string; // e.g., 'Dinas' or 'UPTD PKH Kuningan'
};

export interface StockOpname {
    id: string;
    opnameDate: Date;
    medicineName: string;
    jenisObat?: string;
    satuan?: string;
    expireDate?: Date;
    asalBarang?: string;
    keadaanBulanLaluBaik: number;
    keadaanBulanLaluRusak: number;
    keadaanBulanLaluJml: number;
    pemasukanBaik: number;
    pemasukanRusak: number;
    pemasukanJml: number;
    pengeluaranBaik: number;
    pengeluaranRusak: number;
    pengeluaranJml: number;
    keadaanBulanLaporanBaik: number;
    keadaanBulanLaporanRusak: number;
    keadaanBulanLaporanJml: number;
    keterangan?: string;
}

export interface MonitoringData {
    id: string;
    location: string;
    medicineName: string;
    jenisObat?: string;
    satuan?: string;
    sisaStok: number;
    expireDate: Date | null;
    keterangan?: string;
}

export type AppSettings = {
    dinasName?: string;
    address?: string;
    kepalaDinas?: string;
    nipKepalaDinas?: string;
    kepalaBidang?: string;
    nipKepalaBidang?: string;
    uptdName?: string;
    kepalaUPTD?: string;
    nipKepalaUPTD?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    nip?: string;
    location?: string;
}

export interface StockOpname {
    id: string;
    opnameDate: Date;
    medicineName: string;
    jenisObat?: string;
    satuan?: string;
    expireDate?: Date;
    asalBarang?: string;
    keadaanBulanLaluBaik: number;
    keadaanBulanLaluRusak: number;
    keadaanBulanLaluJml: number;
    pemasukanBaik: number;
    pemasukanRusak: number;
    pemasukanJml: number;
    pengeluaranBaik: number;
    pengeluaranRusak: number;
    pengeluaranJml: number;
    keadaanBulanLaporanBaik: number;
    keadaanBulanLaporanRusak: number;
    keadaanBulanLaporanJml: number;
    keterangan?: string;
    // --- TAMBAHKAN FIELD DI BAWAH INI ---
    userId: string;
    userLocation: string;
    userName: string;
    userRole: 'admin' | 'user';
}

export interface Officials {
    kepalaDinas?: string;
    nipKepalaDinas?: string;
    kepalaBidang?: string;
    nipKepalaBidang?: string;
    kepalaUPTD?: string;
    nipKepalaUPTD?: string;
}

export interface ReportData extends StockOpname {
    // Tipe ini bisa dibiarkan seperti ini
}

export interface DashboardStats {
    totalObat: number;
    totalStok: number;
    stokMenipis: number;
    akanKadaluarsa: number;
    obatStokMenipis: {
        medicineName: string;
        sisaStok: number;
        lokasi: string;
    }[];
}