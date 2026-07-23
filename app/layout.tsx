import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const description =
  "A calm, repeatable operating rhythm that helps growing teams turn priorities into progress.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const requestHost = requestHeaders.get("host");
  const candidateHost = forwardedHost ?? requestHost ?? "";
  const isValidHost =
    /^(?:localhost|127\.0\.0\.1|\[::1\]|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(?::\d{1,5})?$/i.test(
      candidateHost,
    );
  const host = isValidHost ? candidateHost : "localhost:3000";
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host.startsWith("localhost") ||
          host.startsWith("127.0.0.1") ||
          host.startsWith("[::1]")
        ? "http"
        : "https";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: {
      default: "Northstar Ops",
      template: "%s | Northstar Ops",
    },
    description,
    openGraph: {
      title: "Northstar Ops",
      description,
      type: "website",
      siteName: "Northstar Ops",
    },
    twitter: {
      card: "summary_large_image",
      title: "Northstar Ops",
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
