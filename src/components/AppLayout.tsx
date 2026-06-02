import { Outlet } from "react-router-dom";

import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";

/** Shared chrome for all routes except the standalone overlay runner. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="container flex-1 px-4 py-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default AppLayout;
