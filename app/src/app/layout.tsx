import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OrgVault — Guarded AI Treasury for Student Organizations",
  description:
    "AI-checked, on-chain student organization funds on BNB Smart Chain Testnet (Chain ID 97).",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "OrgVault — Guarded AI Treasury for Student Organizations",
    description:
      "AI-checked, on-chain student organization funds on BNB Smart Chain Testnet (Chain ID 97).",
    images: ["/logo-on-blue.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
