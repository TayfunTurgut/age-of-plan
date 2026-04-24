import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { getTheme, setTheme } from "@/lib/theme";

/**
 * Wraps non-runner routes with the persistent NavBar.
 * Re-applies the stored theme on mount as a safety net behind
 * the blocking script in index.html.
 */
export const AppLayout = () => {
  useEffect(() => {
    setTheme(getTheme());
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
