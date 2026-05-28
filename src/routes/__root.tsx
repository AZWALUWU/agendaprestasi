import * as Sentry from "@sentry/react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import {
  AuthProvider,
  useAuth,
} from "@frontend/hooks/use-auth";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { initSentry } from "@/lib/sentry/client";
import appCss from "../styles.css?url";
initSentry();

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Halaman tidak ditemukan
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<RouterContext>()({
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "Agenda Prestasi — Beasiswa & Lomba",
        },
        {
          name: "description",
          content:
            "Temukan beasiswa dan lomba terbaru untuk mahasiswa dan pelajar Indonesia.",
        },
        {
          property: "og:title",
          content: "Agenda Prestasi — Beasiswa & Lomba",
        },
        {
          property: "og:description",
          content:
            "Platform pencarian beasiswa dan kompetisi terbaru.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:image",
          content: "/agendaprestasi.png",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:image",
          content: "/agendaprestasi.png",
        },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "96x96",
          href: "/favicon-96x96.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "/site.webmanifest",
        },
      ],
    }),

    shellComponent: RootShell,

    component: RootComponent,

    notFoundComponent: NotFoundComponent,
  });

function RootShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppGate() {
  const { loading } = useAuth();

  return (
    <>
      <div style={{ display: loading ? "none" : "block" }}>
        <Sentry.ErrorBoundary fallback={<div>Terjadi error aplikasi.</div>}>
          <Outlet />
        </Sentry.ErrorBoundary>
      </div>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="text-sm font-medium text-muted-foreground">
              Memuat aplikasi...
            </p>
          </div>
        </div>
      )}
      <Toaster position="top-right" richColors />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}