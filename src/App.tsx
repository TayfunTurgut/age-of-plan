import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import Library from "./pages/Library.tsx";
import CivDetail from "./pages/CivDetail.tsx";
import NewBuildOrder from "./pages/NewBuildOrder.tsx";
import BuildOrderPlaceholder from "./pages/BuildOrderPlaceholder.tsx";
import BuildOrderEditor from "./pages/BuildOrderEditor.tsx";
import BuildOrderRunner from "./pages/BuildOrderRunner.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
