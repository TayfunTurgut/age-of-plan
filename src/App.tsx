import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "@/pages/Index";
import Library from "@/pages/Library";
import CivDetail from "@/pages/CivDetail";
import NewBuildOrder from "@/pages/NewBuildOrder";
import BuildOrderPlaceholder from "@/pages/BuildOrderPlaceholder";
import NotFound from "@/pages/NotFound";

// Heaviest, least-visited routes are split out of the initial bundle.
const BuildOrderEditor = lazy(() => import("@/pages/BuildOrderEditor"));
const BuildOrderRunner = lazy(() => import("@/pages/BuildOrderRunner"));

function RouteFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  );
}

// react-query's only consumer is the aoe4guides importer (ImportModal).
const queryClient = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/library" element={<Library />} />
                <Route path="/civ/:id" element={<CivDetail />} />
                <Route path="/build/new" element={<NewBuildOrder />} />
                <Route path="/build/:id" element={<BuildOrderPlaceholder />} />
                <Route path="/build/:id/edit" element={<BuildOrderEditor />} />
              </Route>
              {/* Runner stays outside the layout — no nav chrome in the overlay window. */}
              <Route path="/build/:id/run" element={<BuildOrderRunner />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
