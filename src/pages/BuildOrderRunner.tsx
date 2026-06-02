import { useParams } from "react-router-dom";

/** Standalone overlay step-runner — no nav chrome. Built out in M12. Lazy-loaded. */
export default function BuildOrderRunner() {
  const { id } = useParams<{ id: string }>();
  return (
    <main className="flex min-h-screen items-center justify-center p-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Runner</h1>
        <p className="mt-2 text-sm text-muted-foreground">Running build {id}</p>
      </div>
    </main>
  );
}
