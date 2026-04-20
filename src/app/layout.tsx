import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AcademyOS",
  description: "Educational Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
