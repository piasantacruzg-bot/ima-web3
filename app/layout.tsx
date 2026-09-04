import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator Campaign OS",
  description:
    "Internal operating system for creator/influencer campaigns — creator database, campaign management, deliverable tracking, and reporting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
