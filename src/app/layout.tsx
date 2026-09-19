import '@/styles/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'DB Dashboard',
  description: 'Local developer dashboard for PostgreSQL, Redis, Qdrant and project inspection',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-gray-100 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
        <footer className="text-center text-xs text-slate-600 py-3 border-t border-slate-800">
          DB Dashboard — Local Development Monitor
        </footer>
      </body>
    </html>
  );
}
