import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beacon AI — Adaptive Learning Companion",
  description:
    "Every student deserves a personal tutor. Beacon AI is a Gemma 4-powered adaptive learning companion that makes quality education accessible to all — with multimodal understanding, multilingual support, and offline-first design.",
  keywords: ["AI tutor", "education", "Gemma 4", "adaptive learning", "multilingual", "offline"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
