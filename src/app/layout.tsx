import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenDoc — Secure Document Sharing & Analytics',
  description:
    'Share documents securely with page-level analytics, access controls, and virtual data rooms.',
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
          colorPrimary: "#34d399",
          colorBackground: "#141518",
          colorInputBackground: "#1a1b1f",
          colorInputText: "#f0f0f2",
          colorText: "#f0f0f2",
          colorTextSecondary: "#94959e",
          colorNeutral: "#f0f0f2",
          colorTextOnPrimaryBackground: "#0c0d0f",
          colorDanger: "#f87171",
          borderRadius: "0.5rem",
        },
        elements: {
          rootBox: "color-scheme: dark",
          card: "bg-[#141518] border border-[#25262b] shadow-none",
          headerTitle: "!text-[#f0f0f2]",
          headerSubtitle: "!text-[#94959e]",
          formFieldLabel: "!text-[#94959e]",
          formFieldInput:
            "!bg-[#1a1b1f] !border-[#25262b] !text-[#f0f0f2] placeholder:!text-[#5c5e66]",
          formButtonPrimary: "!bg-[#34d399] !text-[#0c0d0f] hover:!bg-[#5eead4]",
          footerActionLink: "!text-[#34d399] hover:!text-[#5eead4]",
          socialButtonsBlockButton:
            "!bg-[#1a1b1f] !border-[#25262b] !text-[#f0f0f2] hover:!bg-[#25262b]",
          socialButtonsBlockButtonText: "!text-[#f0f0f2]",
          dividerLine: "!bg-[#25262b]",
          dividerText: "!text-[#5c5e66]",
          formFieldInputShowPasswordButton: "!text-[#94959e] hover:!text-[#f0f0f2]",
          otpCodeFieldInput: "!bg-[#1a1b1f] !border-[#25262b] !text-[#f0f0f2]",
          identityPreview: "!bg-[#1a1b1f] !border-[#25262b]",
          identityPreviewText: "!text-[#f0f0f2]",
          identityPreviewEditButton: "!text-[#34d399]",
          footer: "!bg-transparent",
          footerAction: "!text-[#94959e]",
        },
      }}
    >
      <html lang="en" className="h-full antialiased dark" style={{ colorScheme: 'dark' }}>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
