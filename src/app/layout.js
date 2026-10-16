import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import CommandPalette from "@/components/CommandPalette";
import MotionProvider from "@/components/MotionProvider";

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
  description: "Marque, confirme ou remarque consultas e exames da sua clínica pelo celular, sem ligar e sem fila.",
  applicationName: "RMAgenda",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "RMAgenda" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4F0" },
    { media: "(prefers-color-scheme: dark)", color: "#121214" }
  ]
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

              // LGPD: Limpeza automática de SessionStorage e rascunhos voláteis ao fechar a aba
              if (typeof window !== "undefined") {
                window.addEventListener("beforeunload", function() {
                  try {
                    if (typeof sessionStorage !== "undefined") sessionStorage.clear();
                    if (typeof localStorage !== "undefined") {
                      var keysToRemove = [];
                      for (var i = 0; i < localStorage.length; i++) {
                        var k = localStorage.key(i);
                        if (k && (k.indexOf("rmagenda_jornada") === 0 || k.indexOf("rmcare_jornada") === 0)) {
                          keysToRemove.push(k);
                        }
                      }
                      keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
                    }
                  } catch (err) {}
                });
                window.addEventListener("pagehide", function() {
                  try {
                    if (typeof sessionStorage !== "undefined") sessionStorage.clear();
                  } catch (err) {}
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <MotionProvider>
          {children}
          <CommandPalette />
        </MotionProvider>
      </body>
    </html>
  );
}
