import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'POLLÍSIMO - Abrís el freezer y sonreís',
  description: 'Sistema web de gestión de producción, stock y ventas para Pollisimo.',
  icons: {
    icon: '/logo-sin-fondo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-[#fdf8ee] text-[#2d1e15] antialiased flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-8">{children}</main>
        <footer className="py-4 border-t border-[#ebdcca] bg-[#fbf5ea] text-center text-xs text-[#7c6354]">
          <p>© {new Date().getFullYear()} Pollisimo - Abrís el freezer y sonreís ❤️ | Instagram: @pollisimo | WhatsApp: 2227525946</p>
        </footer>
      </body>
    </html>
  );
}
