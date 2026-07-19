import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PINOVA 色谱工作台",
  description: "浏览拼豆材料、数字图纸与武汉到店创作体验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
