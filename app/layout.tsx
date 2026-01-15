import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MeetMind",
  description: "Multimodal Meeting Copilot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
