import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EchoWidget from "@/components/assistant/EchoWidget";
import "./globals.css";
import Toaster from "@/components/Toaster";
import SiteSettingsHydrator from "@/components/SiteSettingsHydrator";
import AuthHydrator from "@/components/AuthHydrator";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "NUMEN. — Wear the Drop",
  description: "Futuristic streetwear & accessories, dropped fresh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} bg-bg text-ink font-body antialiased`}
      >
        <SiteSettingsHydrator />
        <AuthHydrator />
        <Navbar />
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
        <Toaster />
        <EchoWidget />
      </body>
    </html>
  );
}