import type { Metadata } from "next";
import { Baloo_2, Comic_Neue, Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${baloo.variable} ${comicNeue.variable} bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
