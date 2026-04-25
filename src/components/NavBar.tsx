import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FontSizeToggle } from "@/components/FontSizeToggle";
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
          className={cn(
            "truncate rounded-sm font-display text-sm font-bold text-primary transition-colors hover:opacity-80",
            "focus-ring",
          )}
        >
          AoE4 Build Order Planner
        </Link>
        <div className="flex items-center gap-2">
          <NavLink
            to="/library"
            className={cn(
              "rounded-md px-2 py-1 text-sm transition-colors",
              "text-muted-foreground hover:text-foreground",
              "focus-ring",
            )}
            activeClassName="text-primary"
          >
            Library
          </NavLink>
          <FontSizeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            className="focus-ring"
          >
            <span
              className={cn(
                "inline-flex transition-transform duration-300 ease-out",
                isDark ? "rotate-0" : "rotate-180",
              )}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
