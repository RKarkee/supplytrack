import type { Metadata } from "next";
import "./globals.css";
import { AntdProvider, AuthProvider, QueryProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "SupplyTrack - Smart Inventory Management",
  description: "Smart Inventory + POS + AI Analytics System for shopkeepers in Nepal",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0 }}>
        <AuthProvider>
          <QueryProvider>
            <AntdProvider>
              {children}
            </AntdProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
