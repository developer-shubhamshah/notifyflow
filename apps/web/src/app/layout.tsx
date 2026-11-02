import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotifyFlow | Campaign Management",
  description:
    "Manage multiple brands, contacts, campaigns and messaging channels from one platform.",
  applicationName: "NotifyFlow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}