import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./providers/ThemeProvider";
import BottomNavigation from "./component/BottomNavigation";
import dynamic from "next/dynamic";

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
// FIX: Dynamic import of LucidProvider to prevent SSR
// This ensures Lucid (which uses WebAssembly) only loads in the browser
const ClientProviderWrapper = dynamic(
  () => import("./component/Lucid/ClientProviderWrapper"),
  {
    ssr: false, // Disable server-side rendering for this component
    loading: () => null, // Optional: show nothing while loading
  }
);

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
            <ClientProviderWrapper>
              <ThemeProvider>{children}</ThemeProvider>
            </ClientProviderWrapper>
          </BottomNavigation>
        </SessionProvider>
      </body>
    </html>
  );
}
