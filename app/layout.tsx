import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TritonDFT",
  description: "LLM-driven DFT computation interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
