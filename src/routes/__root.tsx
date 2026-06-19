import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { fetchSettings } from "@/lib/storefront";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { MetaPixelLoader } from "@/components/meta-pixel-loader";
import { trackPixel } from "@/lib/meta-pixel";
import { captureUtm } from "@/lib/utm";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppFloatingButton } from "@/components/site-chrome";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_OG_IMAGE =
  "https://i.postimg.cc/CKV3Zwfg/wmremove-transformed-(8).png";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    try {
      const settings = await context.queryClient.ensureQueryData({
        queryKey: ["public-settings"],
        queryFn: fetchSettings,
      });
      return { heroImage: settings.hero_image_url || FALLBACK_OG_IMAGE };
    } catch {
      return { heroImage: FALLBACK_OG_IMAGE };
    }
  },
  head: ({ loaderData }) => {
    const ogImage = loaderData?.heroImage ?? FALLBACK_OG_IMAGE;
    const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Leen Bakery — Fresh-baked NYC-style cookies" },
        {
          name: "description",
          content: "Hand-baked NYC-style cookies by Leen Bakery. Build your own box, mix any flavors, delivered fresh.",
        },
        { property: "og:site_name", content: "Leen Bakery" },
        { property: "og:title", content: "Leen Bakery" },
        { property: "og:description", content: "Build your own box. Mix any flavors. Delivered fresh." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: siteUrl },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Leen Bakery — NYC-style cookies" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Leen Bakery" },
        { name: "twitter:description", content: "Build your own box. Mix any flavors. Delivered fresh." },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Cairo:wght@400;600;700&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    captureUtm();
    // Skip the FIRST onResolved event, which fires during SSR hydration for the
    // initial route. MetaPixelLoader.useEffect already owns that initial PageView.
    // Without this guard, two PageViews fire on every initial page load:
    //   #1 — router.subscribe("onResolved") catches the hydration navigation
    //   #2 — MetaPixelLoader fires after the async Supabase pixel-ID fetch
    let initialHydrationSkipped = false;
    return router.subscribe("onResolved", () => {
      captureUtm();
      if (!initialHydrationSkipped) {
        initialHydrationSkipped = true;
        return; // MetaPixelLoader handles the initial PageView
      }
      trackPixel("PageView");
    });
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CartProvider>
          <MetaPixelLoader />
          <Outlet />
          <Toaster />
          <WhatsAppFloatingButton />
        </CartProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
