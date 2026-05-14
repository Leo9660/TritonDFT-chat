import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "TritonDFT — Chat",
  description: "LLM-driven DFT computation. Describe what you want — get publication-ready results.",
  openGraph: {
    title: "TritonDFT — Chat",
    description: "Describe what you want — get publication-ready DFT results.",
    url: "https://chat.tritondft.com",
    images: [{ url: "/logo.png", width: 256, height: 256 }],
  },
  twitter: {
    card: "summary",
    title: "TritonDFT — Chat",
    description: "Describe what you want — get publication-ready DFT results.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
