import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

// Every page reads live data from the database (and the sidebar shows the count of
// conflicts waiting on a decision), so nothing here is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Traveler — Story Wiki",
  description: "Story wiki and braided timeline for The Traveler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="min-w-0 flex-1 p-8">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
