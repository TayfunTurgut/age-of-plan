import { useState } from "react";
import { Link } from "react-router-dom";

import { CivFlag } from "@/components/CivFlag";
import { ImportModal } from "@/components/ImportModal";
import { Seo } from "@/components/Seo";
import { Card } from "@/components/ui/card";
import { CIVS, getCiv } from "@/data/civs";

/** Home — civilization picker. Renders inside AppLayout (nav + footer). */
export default function Index() {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <section className="page-enter">
      <Seo
        title="Age of Plan"
        description="Create, edit, import, export, and follow Age of Empires IV build orders step by step. Pick a civilization to start, or import a build from aoe4guides."
        path="/"
      />

      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold tracking-wide text-primary sm:text-5xl">
          Age of Plan
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose a civilization
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link
            to="/library"
            className="underline-offset-2 hover:text-primary hover:underline focus-ring"
          >
            Browse the library
          </Link>
          <span className="mx-2 opacity-60">·</span>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="underline-offset-2 hover:text-primary hover:underline focus-ring"
          >
            or import a build
          </button>
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CIVS.map((civ) => {
          const parent = getCiv(civ.variantOf);
          return (
            <li key={civ.id}>
              <Link to={`/civ/${civ.id}`} className="group block h-full focus-ring rounded-lg">
                <Card className="flex h-full items-start gap-4 p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]">
                  <CivFlag civ={civ} size="md" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-xl font-bold text-foreground">
                      {civ.name}
                    </h2>
                    {parent && (
                      <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">
                        Variant of {parent.name}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-snug text-muted-foreground">
                      {civ.tagline}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
    </section>
  );
}
