import type { Metadata } from "next";
import "../(app)/globals.css";

// Its own root layout (html/body), per Next.js's documented "multiple root layouts" convention
// for route groups: /login isn't inside the (app) group (no nav shell, nothing authenticated
// yet), so it can't share (app)/layout.tsx's root layout or its @modal parallel-route slot.
export const metadata: Metadata = {
  title: "Sign in — The Traveler",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
