import { useParams } from "react-router-dom";

/** Build landing — edit / run / export actions for one build. Built out in M9. */
export default function BuildOrderPlaceholder() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="page-enter">
      <h1 className="font-display text-3xl font-bold">Build order</h1>
      <p className="mt-2 text-muted-foreground">Build {id}</p>
    </section>
  );
}
