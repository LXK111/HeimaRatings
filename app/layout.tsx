import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEMA Ratings",
  description: "HEMA 多武器类型积分与排名管理 MVP",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
