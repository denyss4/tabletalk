import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tabletalk — Split the receipt, keep the conversation",
  description: "Add a receipt and say who had what. Share dishes, correct a coffee, and split every cent fairly.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
