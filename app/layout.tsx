import type { Metadata } from "next";
import { Baloo_2, Comic_Neue } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  weight: ["400", "500", "600", "700"],
});

const comicNeue = Comic_Neue({
  subsets: ["latin"],
  variable: "--font-comic",
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Memory Palace",
  description: "Learn faster with AI-generated memory palaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${comicNeue.variable} font-sans antialiased text-slate-900 bg-[#EEF2FF]`}>
        {children}
      </body>
    </html>
  );
}
