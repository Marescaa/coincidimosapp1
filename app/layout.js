import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import BackButton from "./components/BackButton";
import { ToastProvider } from "./components/ui/Toast";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata = {
  title: "Coincidimos",
  description: "Coordiná juntadas con tus amigos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${syne.variable} ${dmSans.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#34D399" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <BackButton />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}