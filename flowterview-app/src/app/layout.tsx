import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import AuthListener from "./auth-listener";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Flowterview - AI-Powered Interview Platform",
  description:
    "AI-driven interview platform for technical and non-technical interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${workSans.variable} antialiased`}>
        <AuthListener>{children}</AuthListener>
      </body>
    </html>
  );
}
