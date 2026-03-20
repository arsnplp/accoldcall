'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Bell, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/leads/new', icon: Plus, label: 'Nouveau', highlight: true },
  { href: '/reminders', icon: Bell, label: 'Rappels' },
  { href: '/settings', icon: Settings, label: 'Réglages' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-6">
                <div className="w-14 h-14 bg-brand-500 rounded-full flex items-center justify-center shadow-lg active:bg-brand-600">
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1',
                isActive ? 'text-brand-500' : 'text-gray-500'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
