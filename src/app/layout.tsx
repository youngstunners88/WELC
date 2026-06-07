import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WELC Academy",
  description: "위준성 영어 라이프 컨설팅 — Scheduling, attendance, and teacher hours.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={notoSansKr.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
