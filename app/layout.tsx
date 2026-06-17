import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Psicólogos en Red',
    template: '%s | Psicólogos en Red',
  },
  description: 'Tu camino hacia el bienestar emocional',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#ED87AF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="/estilos.css" />
        <link rel="stylesheet" href="/chat-widget.css" />
      </head>
      <body>
        {children}
        <Script src="/i18n.js" strategy="afterInteractive" />
        <Script src="/chat-widget.js" strategy="afterInteractive" />
        <Script src="/pwa-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
