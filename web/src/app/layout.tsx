import '@/app/globals.css';
import type { Metadata } from 'next';
import { DEFAULT_LOCALE } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Emberlore',
  description: 'Next.js frontend driven by Directus content.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>{children}</body>
    </html>
  );
}
