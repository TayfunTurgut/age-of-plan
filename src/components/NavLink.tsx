import { NavLink as RouterNavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  end?: boolean;
}

/** Top-nav link with active styling derived from the current route. */
export function NavLink({ to, children, end }: NavLinkProps) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}

export default NavLink;
