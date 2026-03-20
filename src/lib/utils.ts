import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function formatRelativeDate(date: string): string {
  const d = new Date(date);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function isDatePast(date: string): boolean {
  return isPast(new Date(date));
}

export function getInitials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
