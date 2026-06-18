import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Psicólogos en Red',
    template: '%s | Psicólogos en Red',
  },
  description: 'Tu camino hacia el bienestar emocional',
  manifest: '/manifest.json',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ED87AF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
