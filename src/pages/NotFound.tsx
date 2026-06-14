import { Link } from "react-router-dom";

/** 404 page for unmatched routes. */
export default function NotFound() {
  return (
    <section className="page-enter mx-auto max-w-xl text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That page doesn&apos;t exist. It may have moved, or the link is wrong.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-ring"
      >
        Back home
      </Link>
    </section>
  );
}
