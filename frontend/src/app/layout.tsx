import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "The Golden Fork — Premium Restaurant Ordering SaaS",
  description: "Experience seamless QR-code based ordering at your favorite restaurants with The Golden Fork.",
  keywords: ["restaurant", "ordering", "saas", "qr-code", "menu", "ordering system"],
  authors: [{ name: "Kamal7004" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
