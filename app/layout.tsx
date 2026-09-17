import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Traveler — Story Wiki",
  description: "Story wiki and braided timeline for The Traveler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
