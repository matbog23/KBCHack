import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Predictive Kate · KBC Mobile",
  description:
    "Hackathon prototype: an engine that reads KBC account transactions, recognises life events and turns them into proactive KBC banking and insurance interventions.",
};

export const viewport: Viewport = {
  themeColor: "#002D62",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
