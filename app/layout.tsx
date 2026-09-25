import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://formly-enterprise.convex.cloud";
}

export const metadata: Metadata = {
  title: "Formly | Enterprise Workflow Form Platform",
  description: "Production-grade workflow form builder, server-authoritative DAG runtime, and real-time telemetry powered by React Flow and Convex.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className="dark">
        <body className="bg-black text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-white selection:text-black font-sans">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
