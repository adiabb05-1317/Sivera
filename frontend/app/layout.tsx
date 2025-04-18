import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Image from "next/image"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Flowterview - Your AI-powered meeting assistant",
  description:
    "Help you with your meetings by answering questions, providing insights, and enabling seamless collaboration.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* <div className="fixed bottom-5 right-5 z-40">
          <Image
            src="/LP-logo.png"
            alt="LP Logo"
            width={40}
            height={40}
            className="opacity-80 hover:opacity-100 transition-opacity ring-emerald-200"
          />
        </div> */}
      </body>
    </html>
  )
}
