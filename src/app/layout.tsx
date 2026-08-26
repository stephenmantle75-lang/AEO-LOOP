import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEO Loop Observatory",
  description: "Evidence dashboard for the Stephen Mantle AEO growth loop.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
