import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./providers/ThemeProvider";
import BottomNavigation from "./component/BottomNavigation";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "classly",
  description: "the online classroom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
          <BottomNavigation>
          {" "}
          <ThemeProvider>{children}</ThemeProvider></BottomNavigation>
        </SessionProvider>
      </body>
    </html>
  );
}
