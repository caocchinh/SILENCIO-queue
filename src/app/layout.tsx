import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";
import { QueryProvider } from "@/context/QueryProvider";

const pangolin = localFont({
  src: "../fonts/[Text] Pangolin-Regular.ttf",
  variable: "--font-pangolin",
});

const italianno = localFont({
  src: "../fonts/[Subtitle] Italianno-Regular.ttf",
  variable: "--font-italianno",
});

export const metadata: Metadata = {
  title: "VTEAM - Bốc số Silencio",
  description: "Bốc số cho sự kiện Silencio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="/assets/favicon.ico" rel="icon" />
      </head>
      <body
        className={`${pangolin.variable} ${italianno.variable} antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster />{" "}
          <footer className="w-full bg-black flex items-center relative z-[1] justify-center text-white text-center p-2">
            <Image
              src="/assets/logo.webp"
              width={26}
              height={26}
              className="invert -mt-[2px]"
              alt="VTEAM Logo"
            />
            VTEAM - Vinschool Central Park
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
