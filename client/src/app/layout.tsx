import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SocketProvider } from "@/context/SocketContext";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "NextStation — Delhi Metro Shared Listening",
  description: "Realtime synchronized music playback across Delhi Metro train lines.",
  appleWebApp: {
    capable: true,
    title: "NextStation",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        <SocketProvider>
          <ServiceWorkerRegistrar />
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
