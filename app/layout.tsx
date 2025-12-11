import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skills Hub | AI Content Studio',
  description: 'Professional AI-powered content generation platform. Create newsletters, research briefs, presentations, and more.',
  keywords: ['AI', 'content generation', 'newsletter', 'research', 'automation'],
  authors: [{ name: 'Elets Technomedia' }],
  openGraph: {
    title: 'Skills Hub | AI Content Studio',
    description: 'Professional AI-powered content generation platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
