import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppPreloader } from "@/components/app-preloader";
import { getGlobalSiteSettings } from "@/lib/global-settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGlobalSiteSettings();
  
  return {
    title: settings?.site_title || "SabiBio | AI customer operations",
    description: settings?.meta_description || "AI-assisted customer conversations, CRM, and automation for WhatsApp and Telegram.",
    keywords: settings?.seo_keywords || [],
    openGraph: {
      title: settings?.site_title,
      description: settings?.meta_description,
      images: settings?.og_image_url ? [{ url: settings.og_image_url }] : [],
      siteName: "SabiBio",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: settings?.site_title,
      description: settings?.meta_description,
      images: settings?.og_image_url ? [settings.og_image_url] : [],
    },
    icons: {
      icon: settings?.universal_favicon_url || "/favicon.ico",
      apple: settings?.universal_favicon_url || "/favicon.ico",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-[#0B0E14] text-gray-900 dark:text-gray-300">
        <Providers><AppPreloader />{children}</Providers>
      </body>
    </html>
  );
}
