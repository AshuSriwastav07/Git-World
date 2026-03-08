import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Git World",
  description:
    "Git World — A 3D city where every building is a real GitHub developer. Built by Ashusriwastav07.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Git World",
    description: "A 3D Minecraft-style city where every building is a real GitHub developer.",
    siteName: "Git World",
    type: "website",
    images: [{ url: "/Logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Git World",
    description: "A 3D Minecraft-style city where every building is a real GitHub developer.",
    images: ["/Logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pixelFont.variable}>
      <body>{children}</body>
    </html>
  );
}
