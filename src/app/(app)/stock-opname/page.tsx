"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'; // Import 'where'
import { db } from '@/lib/firebase';
import type { StockOpname } from '@/lib/types';
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useUser } from '@/contexts/UserProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DataTable } from './components/data-table';
import { getColumns, type StockOpnameActionHandlers } from './components/columns';
import { StockOpnameFormSheet } from './components/stock-opname-form-sheet';
import { deleteStockOpnameAction } from '@/actions/stock-opname-actions';

export default function StockOpnamePage() {
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [opnameToDelete, setOpnameToDelete] = useState<StockOpname | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    // --- PERUBAHAN LOGIKA DIMULAI DI SINI ---
    let q;
    const baseQuery = collection(db, "stock-opnames");

    // Jika bukan admin, filter berdasarkan userId
    if (user.role !== 'admin') {
        q = query(baseQuery, where("userId", "==", user.id), orderBy("opnameDate", "desc"));
    } else {
        // Admin melihat semua data
        q = query(baseQuery, orderBy("opnameDate", "desc"));
    }
    // --- PERUBAHAN LOGIKA SELESAI DI SINI ---
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      // ... (Sisa logika onSnapshot tetap sama)
    });

    return () => unsubscribe();
    
  }, [user, toast]);

  // ... (Sisa kode komponen tetap sama)
}