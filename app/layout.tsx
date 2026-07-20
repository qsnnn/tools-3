import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  let origin: URL;
  try {
    origin = new URL(`${protocol}://${host}`);
  } catch {
    origin = new URL("http://localhost:3000");
  }

  const title = "Transfer Record Studio";
  const description =
    "Generate a styled telegraphic transfer style record with editable sections, local draft save/load, and A4 print/PDF export.";
  const image = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: image,
          width: 1536,
          height: 1024,
          alt: "Transfer Record Studio preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

