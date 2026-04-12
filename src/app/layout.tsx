import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DocVault — Secure Document Sharing & Analytics",
  description: "Share documents securely with page-level analytics, access controls, virtual data rooms, and e-signatures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#c49a4a",
          colorBackground: "#1f1d1a",
          colorInputBackground: "#17150f",
          colorInputText: "#ece8e2",
        },
      }}
    >
      <html lang="en" className={`${manrope.variable} h-full antialiased dark`}>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
