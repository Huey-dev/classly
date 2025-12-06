import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./providers/ThemeProvider";
import BottomNavigation from "./component/BottomNavigation";
import { LucidProvider } from './context/LucidContext';


const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Classly - Decentralized Education Platform",
  description: "Learn and teach with blockchain-powered escrow payments",
  icons: {
    icon: "/app-logo.png",
    shortcut: "/app-logo.png",
    apple: "/app-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="buffer-polyfill" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              window.global = window;
              window.process = { env: {} };
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
          <BottomNavigation>
          {" "}
          <LucidProvider>
          <ThemeProvider>{children}</ThemeProvider></LucidProvider></BottomNavigation>
        </SessionProvider>
      </body>
    </html>
  );
}
