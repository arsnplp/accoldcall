'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function Header({ title, showBack = false, rightAction, className }: HeaderProps) {
  const router = useRouter();

  return (
    <header className={cn('sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100', className)}>
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
