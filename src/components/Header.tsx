'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Server, Boxes, FolderOpen, Cpu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Overview', icon: Server },
  { href: '/postgres', label: 'PostgreSQL', icon: Database },
  { href: '/redis', label: 'Redis', icon: Cpu },
  { href: '/qdrant', label: 'Qdrant', icon: Boxes },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center h-14 gap-1">
          <Link href="/" className="text-lg font-bold text-white mr-6 tracking-tight flex items-center gap-2">
            <Database size={20} className="text-emerald-400" />
            <span>DB Dashboard</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-700/80 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
