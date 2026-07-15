import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocFlux — Intelligent Document Processing",
  description:
    "Upload receipts, invoices, government IDs, POs, delivery challans, e-bills and more. AI-powered OCR text extraction and structured field parsing.",
  keywords: [
    "OCR", "document parsing", "invoice OCR", "receipt OCR",
    "GST invoice", "government ID", "document automation", "DocFlux",
  ],
  authors: [{ name: "DocFlux" }],
  icons: {
    icon: "/brand/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${lora.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
