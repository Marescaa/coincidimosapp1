// app/layout.js
// CAMBIOS vs. versión anterior:
// 1. Agregado ToastProvider para reemplazar alert() en toda la app
// 2. Agregada meta apple-mobile-web-app-title
// 3. Fonts migrados a next/font/google (evita FOUT y mejora performance)

import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import BackButton from "./components/BackButton";
import { ToastProvider } from "./components/ui/Toast";

// next/font carga las fuentes de forma óptima (sin FOUT, con preload)
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata = {
  title: "Coincidimos",
  description: "Coordiná juntadas con tus amigos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coincidimos",
  },
  themeColor: "#34D399",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${syne.variable} ${dmSans.variable}`}>
      <head>
        {/* theme-color ya va en metadata pero lo dejamos para compatibilidad */}
        <meta name="theme-color" content="#34D399" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}>
        <ToastProvider>
          <BackButton />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
