"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/contexts/UserProvider';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import {
  LayoutDashboard,
  Box,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Monitor,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const NavItem = ({ href, icon: Icon, children, tooltip }: { href: string; icon: React.ElementType; children: React.ReactNode; tooltip: string }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={tooltip}
      >
        <Link href={href}>
          <Icon />
          <span>{children}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);
  
  if (loading || !isAuthenticated) {
    return (
       <div className="flex h-screen w-full items-center justify-center">
         <Skeleton className="h-[90vh] w-[95vw] rounded-lg" />
       </div>
    );
  }

  const handleLogout = async () => {
    await logout();
  };
  
  const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/stock-opname': 'Stock Opname',
    '/monitoring-uptd': 'Monitoring UPTD',
    '/laporan': 'Laporan Stock Opname',
    '/users': 'Manajemen Pengguna',
    '/pengaturan': 'Pengaturan Aplikasi',
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Logo className="h-10 text-primary w-auto" />
            <h1 className="text-xl font-bold font-headline"></h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <NavItem href="/dashboard" icon={LayoutDashboard} tooltip="Dashboard">
              Dashboard
            </NavItem>
            <NavItem href="/stock-opname" icon={Box} tooltip="Stock Opname">
              Stock Opname
            </NavItem>
             {user?.role === 'admin' && (
              <NavItem href="/monitoring-uptd" icon={Monitor} tooltip="Monitoring UPTD">
                Monitoring UPTD
              </NavItem>
            )}
            <NavItem href="/laporan" icon={FileText} tooltip="Laporan">
              Laporan
            </NavItem>
            {user?.role === 'admin' && (
              <NavItem href="/users" icon={Users} tooltip="Users">
                Manajemen Pengguna
              </NavItem>
            )}
            <NavItem href="/pengaturan" icon={Settings} tooltip="Pengaturan">
              Pengaturan
            </NavItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-4">
             <SidebarTrigger className="md:hidden" />
             <h2 className="text-xl font-semibold font-headline">{pageTitles[pathname] || ''}</h2>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2 px-2">
                 <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.role === 'admin' ? 'Admin Dinas' : 'User UPTD'}</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/pengaturan')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
