import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm p-4',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
