import "./globals.css";
import BackButton from "./components/BackButton";
import { ToastProvider } from "./components/ui/Toast";

export const metadata = {
  title: "Coincidimos",
  description: "Coordiná juntadas con tus amigos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Preconnect mejora la velocidad de carga de Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fuentes cargadas desde <head>, no desde CSS — más confiable en Vercel */}
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
          rel="stylesheet"
        />
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