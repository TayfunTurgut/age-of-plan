import { Link } from "react-router-dom";
import { Swords } from "lucide-react";

import { NavLink } from "@/components/NavLink";

/** Primary navigation. Theme + font-size controls are added in M4. */
export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="container flex h-14 items-center justify-between gap-2 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-wide focus-ring"
        >
          <Swords className="size-5 text-primary" aria-hidden="true" />
          <span>Age of Plan</span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/library">Library</NavLink>
          <NavLink to="/build/new">New build</NavLink>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
