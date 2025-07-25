"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

import { useUser } from '@/contexts/UserProvider';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable } from '@/app/(app)/stock-opname/components/data-table';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserFormSheet } from './components/user-form-sheet';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAction } from '@/actions/user-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function UsersPage() {
    const { user: currentUser } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);


    useEffect(() => {
        if(currentUser && currentUser.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [currentUser, router]);

    useEffect(() => {
        if (!currentUser) return;

        const q = collection(db, "users");
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                // Filter out the currently logged-in admin user
                if (doc.id !== currentUser.id) {
                    usersData.push({ id: doc.id, ...doc.data() } as User);
                }
            });
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsSheetOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsSheetOpen(true);
    };

    const openDeleteDialog = (user: User) => {
        setUserToDelete(user);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        try {
            const result = await deleteUserAction(userToDelete.id);
            if(result.success) {
                toast({
                    title: "Pengguna Dihapus",
                    description: `Pengguna ${userToDelete.name} telah berhasil dihapus.`,
                });
            } else {
                 toast({
                    title: "Gagal Menghapus",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting user: ", error);
            toast({
                title: "Gagal Menghapus",
                description: "Terjadi kesalahan saat menghapus pengguna.",
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const columns: ColumnDef<User>[] = useMemo(() => [
        { accessorKey: "name", header: "Nama" },
        { accessorKey: "email", header: "Email" },
        {
            accessorKey: "role",
            header: "Peran",
            cell: ({ row }) => {
                const role = row.getValue("role") as string;
                return <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="capitalize">{role}</Badge>
            }
        },
        { accessorKey: "location", header: "Lokasi" },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>Ubah Data</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => openDeleteDialog(user)}
                            >
                                Hapus Pengguna
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    if (loading || !currentUser || currentUser.role !== 'admin') {
        return (
             <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

  return (
    <>
        <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
            <div>
            <h2 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
            <p className="text-muted-foreground">
                Kelola akun pengguna untuk admin dinas dan operator UPTD.
            </p>
            </div>
             <Button size="sm" onClick={handleAddUser}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Pengguna
            </Button>
        </div>
        <DataTable data={users} columns={columns} filterColumn="name"/>
        </div>
        <UserFormSheet 
            isOpen={isSheetOpen}
            setIsOpen={setIsSheetOpen}
            user={selectedUser}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Tindakan ini akan menghapus pengguna <strong>{userToDelete?.name}</strong> secara permanen dari sistem otentikasi dan database.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                    Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
