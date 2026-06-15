// app/layout.tsx
import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const monaSans = Mona_Sans({ 
  subsets: ["latin"],
  variable: "--font-mona-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Interview Platform",
  description: "Practice interviews with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={monaSans.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}