import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Inframantra \u2014 Luxury Residences, Gurugram",
  description:
    "Explore Westin Residences and Tulip Monsella \u2014 ultra-luxury homes in Gurugram's most prestigious addresses. Speak with ARIA, your personal property advisor.",
  keywords: "luxury real estate, Gurugram, Westin Residences, Tulip Monsella, premium homes, investment",
  openGraph: {
    title: "Inframantra \u2014 Luxury Residences",
    description: "Ultra-luxury residences in Gurugram. \u20b95 Cr \u2013 \u20b915 Cr & above.",
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
