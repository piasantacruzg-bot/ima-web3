import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMA WEB3 · Reportes de Influencers",
  description:
    "Registra links publicados por influencers y actualiza sus metricas automaticamente en una master sheet de Google Drive.",
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
