import { Link, useSearchParams } from "react-router-dom";
import { getCiv } from "@/data/civs";
import { Card } from "@/components/ui/card";

const NewBuildOrder = () => {
  const [params] = useSearchParams();
  const civId = params.get("civ") ?? "";
  const civ = getCiv(civId);

  return (
    <main className="min-h-screen bg-background px-6 py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          to={civ ? `/civ/${civ.id}` : "/"}
          className="inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← Back{civ ? ` to ${civ.name}` : ""}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold text-primary sm:text-4xl">
          New Build Order{civ ? ` — ${civ.name}` : ""}
        </h1>

        <Card className="mt-6 border-dashed bg-muted/30 p-8 text-center">
          <p className="font-serif text-muted-foreground">Editor coming soon.</p>
        </Card>
      </div>
    </main>
  );
};

export default NewBuildOrder;
