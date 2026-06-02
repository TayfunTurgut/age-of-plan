import { useParams } from "react-router-dom";

/** Drag-and-drop editor with autosave. Built out in M10–M11. Lazy-loaded. */
export default function BuildOrderEditor() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="page-enter">
      <h1 className="font-display text-3xl font-bold">Edit build</h1>
      <p className="mt-2 text-muted-foreground">Editing build {id}</p>
    </section>
  );
}
