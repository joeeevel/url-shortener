import { Navbar } from "@/src/components/layout/navbar";
import { Hero } from "@/src/components/sections/hero";
import { AuthProvider } from "@/src/contexts/auth";
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import "./globals.css";
import { Features } from "@/src/components/sections/features";
import { Pricing } from "@/src/components/sections/pricing";
const sfPro = localFont({
  src: [
    {
      path: '/fonts/sf-pro-display-light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '/fonts/sf-pro-display-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '/fonts/sf-pro-display-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '/fonts/sf-pro-display-semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '/fonts/sf-pro-display-bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '/fonts/sf-pro-display-black.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-sf-pro',
})

const coolvetica = localFont({
  src: [
    {
      path: '/fonts/coolvetica.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-coolvetica',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "Foxy — URL Shortener",
  description: "Shorten, track, and manage your URLs. Zero-knowledge encryption available.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sfPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col custom-scrollbar">
        <Navbar />
        <AuthProvider>
          {children}
        </AuthProvider>
        <main className="grow">

          <Hero />
          <Features />
          <Pricing />
        </main>


      </body>
    </html>
  );
}
