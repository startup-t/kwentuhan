import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, Kalam } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { Analytics } from "@vercel/analytics/next";

// ── Fonts loaded at build-time — zero external requests, zero CLS ──────────
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kwentuhan — Real conversations, real connections.",
  description: "A card-based social conversation app. Solo or group, with 476 questions that go deep.",
  keywords: ["kwentuhan", "conversation", "card game", "Filipino", "social"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kwentuhan",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F7FA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${kalam.variable}`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="kw-bg antialiased">
        <ServiceWorkerRegistrar />
        <Analytics />
        <div className="relative z-10 min-h-dvh flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
