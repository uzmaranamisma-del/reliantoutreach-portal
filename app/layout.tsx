import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReliantOutreach | Revenue Operations',
  description: 'Revenue infrastructure for B2B companies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
