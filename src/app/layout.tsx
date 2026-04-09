import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import PWARegistration from "@/components/PWARegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "SPS Business OS",
  description: "Sistema integral de seguridad corporativa y privada",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SPS Business",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
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
    <html lang="es" className="h-full bg-zinc-950">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-zinc-950 text-foreground h-full overflow-x-hidden`}
      >
        <PWARegistration />
        
        {/* Master Shell Components */}
        <Sidebar />
        <AppHeader />
        
        {/* Nuclear Content Wrapper: Fixed padding logic */}
        <main className="min-h-screen pt-20 lg:pl-32 pb-32 lg:pb-0 transition-all duration-700">
          <div className="w-full h-full p-4 lg:p-12">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
