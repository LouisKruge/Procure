import type { Metadata } from "next";

import { MarketingNav } from "@/components/marketing/nav";

export const metadata: Metadata = {
  title: "Nexus — The operating system for industrial operations",
  description:
    "Multi-site inventory, receiving, dispatch, transfers, stock takes and procurement for industrial operations. Every movement audited, every site live.",
  keywords: [
    "inventory management",
    "multi-site stock control",
    "procurement software",
    "industrial inventory",
    "stock takes",
    "warehouse management",
  ],
  openGraph: {
    title: "Nexus — The operating system for industrial operations",
    description:
      "Multi-site inventory, receiving, dispatch, transfers, stock takes and procurement. Every movement audited, every site live.",
    type: "website",
    siteName: "Nexus",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus — The operating system for industrial operations",
    description:
      "Multi-site inventory, receiving, dispatch, transfers, stock takes and procurement.",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[var(--layer-base)]">
      <MarketingNav />
      <main>{children}</main>
    </div>
  );
}
