import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ColdCraft — AI Cold Email Generator",
  description: "Generate tailored cold emails for job applications instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
