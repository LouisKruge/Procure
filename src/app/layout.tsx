import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/* Every quantity, price, stock code and bin in the app is set in this. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-src",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nexus — Industrial Operations",
  description:
    "Inventory, procurement and stock control for industrial operations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#111318",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark only, set on the server so there is no flash and no theme script.
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${sans.variable} ${mono.variable} font-sans antialiased`}
        style={
          {
            "--font-mono-stack": `var(--font-mono-src), ui-monospace, SFMono-Regular, Menlo, monospace`,
          } as React.CSSProperties
        }
      >
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          closeButton
          toastOptions={{
            style: {
              background: "var(--layer-floating)",
              border: "1px solid var(--line)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-lg)",
            },
          }}
        />
      </body>
    </html>
  );
}
