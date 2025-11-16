import type { Metadata } from 'next';
import favicon from '@/assets/images/favicon.png';
import faviconSVG from '@/assets/images/favicon.svg';
import './global.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SpireKey',
  description: 'Kadena SpireKey wallet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href={favicon.src} sizes="any" />
        <link rel="icon" href={faviconSVG.src} type="image/svg+xml" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
