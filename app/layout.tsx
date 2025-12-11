import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elets Skills Hub | AI Content Generator',
  description: 'AI-powered content generation hub for Elets Technomedia - Create newsletters, research briefs, speaker mailers, and more.',
  keywords: ['AI', 'content generation', 'newsletter', 'research', 'Elets', 'eGovernance', 'eHealth', 'BFSI'],
  authors: [{ name: 'Elets Technomedia' }],
  openGraph: {
    title: 'Elets Skills Hub | AI Content Generator',
    description: 'AI-powered content generation hub for Elets Technomedia',
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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
