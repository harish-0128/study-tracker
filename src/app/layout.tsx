import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNAPSE — Academic Mastery & Study Hub',
  description: 'Track daily focus hours, plan exam milestones, and collaborate in peer study hubs.',
  icons: {
    icon: '/favicon.png', // or '/logo.png'
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}