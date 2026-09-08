import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenClaw Gateway | AI Assistant Control Plane',
  description: 'Production-ready self-hosted OpenClaw AI assistant gateway with Telegram integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
