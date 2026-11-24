import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TICKORA — Discover. Book. Experience.",
    template: "%s · TICKORA",
  },
  description:
    "Discover the best events in Cameroon. Book secure tickets for concerts, conferences, festivals and experiences in Buea, Douala, Yaoundé and Limbe.",
  keywords: [
    "events Cameroon",
    "tickets Douala",
    "tickets Yaoundé",
    "Buea events",
    "Limbe events",
    "TICKORA",
  ],
  openGraph: {
    title: "TICKORA — Discover. Book. Experience.",
    description:
      "Cameroon's premium event discovery and ticketing platform. Discover. Book. Experience.",
    url: siteUrl,
    siteName: "TICKORA",
    locale: "en_CM",
    type: "website",
    images: [
      {
        url: "/brand/og-cover.png",
        width: 1200,
        height: 630,
        alt: "TICKORA — Discover Events. Create Memories.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TICKORA — Discover. Book. Experience.",
    description: "Discover events across Cameroon and book secure digital tickets.",
    images: ["/brand/og-cover.png"],
  },
  icons: {
    icon: "/brand/icon.svg",
    apple: "/brand/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#071426",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tickora-theme")||"system";var d=t==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme="dark";}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-xl !border-line !bg-card !text-ink !shadow-float !text-sm",
              description: "!text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
