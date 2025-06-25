import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import AuthListener from "./auth-listener";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import StoreInitializer from "./store-initializer";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Sivera · AI Powered Interview Platform",
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <StoreInitializer>
            <AuthListener>{children}</AuthListener>
          </StoreInitializer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
