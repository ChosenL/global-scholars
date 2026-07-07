import StructuredData from "@/components/StructuredData";
import Script from "next/script";
import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://globalscholarspathway.com"),

  title: {
    default: "Global Scholars Pathway Advisors",
    template: "%s | Global Scholars Pathway Advisors",
  },

  description:
    "Helping students confidently navigate university admissions, credential evaluations, transfer planning, career readiness, and international education with personalized guidance.",

  keywords: [
    "Study in USA",
    "International Students",
    "University Admissions",
    "College Transfer",
    "Credential Evaluation",
    "WES",
    "ECE",
    "Career Readiness",
    "OPT",
    "CPT",
    "Global Scholars Pathway Advisors",
    "Study Abroad",
    "Education Consultant",
  ],

  authors: [
    {
      name: "Global Scholars Pathway Advisors",
    },
  ],

  creator: "Global Scholars Pathway Advisors",

  publisher: "Global Scholars Pathway Advisors",

  verification: {
    google: "-8UqPOaoaCFXWMZea4tjVg2T59rOgoaO192Jg4pRJe0",
  },

  openGraph: {
    title: "Global Scholars Pathway Advisors",
    description:
      "Guiding Dreams. Building Futures. Personalized guidance for international students pursuing higher education in the United States.",
    url: "https://globalscholarspathway.com",
    siteName: "Global Scholars Pathway Advisors",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Global Scholars Pathway Advisors",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Global Scholars Pathway Advisors",
    description:
      "Helping students confidently navigate every step of their international education journey.",
    images: ["/logo.png"],
  },

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${merriweather.variable}`}
    >
      <body>
          <StructuredData />
        {children}
        

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2VVH8SD99D"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2VVH8SD99D');
          `}
        </Script>
      </body>
    </html>
  );
}