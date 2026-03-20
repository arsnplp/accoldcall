import MobileNav from '@/components/layout/MobileNav';
import { ToastProvider } from '@/components/ui/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <MobileNav />
    </ToastProvider>
  );
}
