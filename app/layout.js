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