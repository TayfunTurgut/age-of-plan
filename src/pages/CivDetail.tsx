import { useParams } from "react-router-dom";

/** Builds for a single civilization. Built out in M8. */
export default function CivDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="page-enter">
      <h1 className="font-display text-3xl font-bold capitalize">{id}</h1>
      <p className="mt-2 text-muted-foreground">
        Builds for this civilization will appear here.
      </p>
    </section>
  );
}
