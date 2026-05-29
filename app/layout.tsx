import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "Fieldbase — Alberta Premium Coatings",
  description: "Sales management app for Alberta Premium Coatings",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fieldbase",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#111111] text-[#F5F5F5] min-h-screen">
        <main className="pb-20 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
