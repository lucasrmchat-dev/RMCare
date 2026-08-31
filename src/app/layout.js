import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import CommandPalette from "@/components/CommandPalette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: { default: "RMAgenda", template: "%s · RMAgenda" },
  description: "Agendamento clínico simples, seguro e rápido.",
  applicationName: "RMAgenda",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "RMAgenda" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fafafa"
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="rmagenda-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('rmagenda_theme') || localStorage.getItem('rmcare_theme') || localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                var brandPrim = localStorage.getItem('rmcare_brand_primary') || localStorage.getItem('rmagenda_brand_primary');
                var brandSec = localStorage.getItem('rmcare_brand_secondary') || localStorage.getItem('rmagenda_brand_secondary');
                if (brandPrim) {
                  document.documentElement.style.setProperty('--brand-primary', brandPrim);
                }
                if (brandSec) {
                  document.documentElement.style.setProperty('--brand-secondary', brandSec);
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col selection:bg-[var(--brand-primary,#9FC131)] selection:text-black font-sans">
        {children}
        <CommandPalette />
      </body>
    </html>
  );
}
