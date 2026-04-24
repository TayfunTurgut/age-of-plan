import { Link } from "react-router-dom";
import { CIVS, getCiv } from "@/data/civs";
import { CivFlag } from "@/components/CivFlag";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <main className="min-h-screen bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 text-center md:mb-14">
          <h1 className="font-display text-4xl font-bold tracking-wide text-primary sm:text-5xl md:text-6xl">
            AoE4 Build Order Planner
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">Choose a civilization</p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CIVS.map((civ) => {
            const parent = getCiv(civ.variantOf);
            return (
              <li key={civ.id}>
                <Link to={`/civ/${civ.id}`} className="group block h-full">
                  <Card className="flex h-full items-start gap-4 border-border p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-md">
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
      </div>
    </main>
  );
};

export default Index;
