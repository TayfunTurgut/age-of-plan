import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export const NavBar = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 h-12 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="truncate font-display text-sm font-bold text-primary transition-colors hover:opacity-80"
        >
          AoE4 Build Order Planner
        </Link>
        <div className="flex items-center gap-2">
          <NavLink
            to="/library"
            className={cn(
              "rounded-md px-2 py-1 text-sm transition-colors",
              "text-muted-foreground hover:text-foreground",
            )}
            activeClassName="text-primary"
          >
            Library
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
