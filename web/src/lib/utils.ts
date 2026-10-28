import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BCP47: Record<string, string> = { en: 'en-GB', de: 'de-DE' };

export function formatPrice(cents: number, currency = 'EUR', locale: string = 'de'): string {
  const value = (cents / 100).toLocaleString(BCP47[locale] ?? 'de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${value} ${symbol}`;
}

export function formatDateTime(unixSeconds: number, locale: string = 'de'): string {
  return new Date(unixSeconds * 1000).toLocaleString(BCP47[locale] ?? 'de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
