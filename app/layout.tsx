
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import PanelThemeController from "@/components/PanelThemeController";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Step Out Studio",
  description: "Admin panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning>
          <PanelThemeController />
          {children}
        </body>
      </html>)
   
}
