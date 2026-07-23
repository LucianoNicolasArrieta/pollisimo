'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Factory,
  Receipt,
  Boxes,
  Beef,
  Users,
  PlusCircle,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { href: '/ventas', label: 'Ventas', icon: ShoppingBag },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/produccion', label: 'Producción', icon: Factory },
    { href: '/compras', label: 'Compras', icon: Receipt },
    { href: '/stock', label: 'Stock', icon: Boxes },
    { href: '/productos', label: 'Catálogo', icon: Beef },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fdf8ee]/95 backdrop-blur-md border-b border-[#ebdcca] shadow-xs">
      {/* Top Header Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-36 h-12 sm:w-44 sm:h-14 transition-transform group-hover:scale-102">
            <Image
              src="/logo-sin-fondo.png"
              alt="POLLÍSIMO - Abrís el freezer y sonreís"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#aa1919] text-white shadow-md shadow-red-900/10'
                    : 'text-[#5c4033] hover:bg-[#f4e8d4] hover:text-[#aa1919]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Quick Mobile Action Header button */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/ventas?action=new"
            className="flex items-center gap-1.5 bg-[#aa1919] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Venta
          </Link>
        </div>
      </div>

      {/* Sub-bar Navigation for Mobile Screens */}
      <div className="md:hidden border-t border-[#ebdcca] bg-[#fbf5ea] px-2 py-1 flex items-center justify-around overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[#aa1919] font-bold bg-[#f3e3ce]'
                  : 'text-[#6b5040] hover:text-[#aa1919]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
