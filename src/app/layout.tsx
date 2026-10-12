import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Atkinson_Hyperlegible, Josefin_Sans } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/providers/SessionProvider";
import AppProviders from "@/providers/AppProviders";
import A11ySync from "@/components/shared/A11ySync";
import QuickBubble from "@/components/shared/QuickBubble";
import TourGuide from "@/components/tour/TourGuide";
import NotificationToasts from "@/components/notifications/NotificationToasts";
import AppToaster from "@/components/shared/AppToaster";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";
import { A11Y_BOOT_SCRIPT } from "@/lib/a11y";

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-josefin",
  display: "swap",
});

/* Loaded only when the dyslexia-friendly preference is on: preload is off and
   the CSS rule keys off data-dyslexia, so the default costs nothing. */
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-dyslexia",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "job application tracker",
    "job search organiser",
    "ATS CV builder",
    "Europass CV generator",
    "Lebenslauf builder",
    "cover letter generator",
    "interview tracker",
    "ghost job detector",
    "LinkedIn banner size",
    "profile picture background remover",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  category: "productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${josefin.variable} ${atkinson.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <AppProviders>
            <A11ySync />
            {children}
            <QuickBubble />
            <TourGuide />
            <NotificationToasts />
            <AppToaster />
          </AppProviders>
        </SessionProvider>
      </body>
    </html>
  );
}
