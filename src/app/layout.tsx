import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import PWARegistration from "@/components/PWARegistration";
import CookieBanner from "@/components/legal/CookieBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SPS Custodia",
  description: "Plataforma de gestión de custodia y seguridad privada",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SPS Custodia",
  },
};

export const viewport: Viewport = {
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} font-sans bg-[#FAFAFA] text-foreground h-full overflow-x-hidden`}
      >
        <PWARegistration />
        
        {/* Shell */}
        <Sidebar />
        <AppHeader />
        
        {/* Main Content */}
        <main className="min-h-screen pt-16 lg:pl-[240px] pb-24 lg:pb-0">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
        <CookieBanner />
      </body>
    </html>
  );
}
