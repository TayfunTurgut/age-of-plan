import OverlayStepCard from "@/components/OverlayStepCard";
import { getCiv } from "@/data/civs";
import type { BuildOrder } from "@/types/buildOrder";

type Props = {
  bo: BuildOrder;
};

/** Static, read-only preview of a whole build (used on the build landing page). */
export default function OverlayPreview({ bo }: Props) {
  const civ = getCiv(bo.civilization);

  return (
    <section aria-label="Overlay preview" className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Preview
      </h2>

      {bo.steps.length === 0 ? (
        <p className="text-base text-muted-foreground">No steps in this build yet.</p>
      ) : (
        <ol className="space-y-3">
          {bo.steps.map((step, idx) => (
            <li key={step.id} className="max-w-[480px] space-y-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Step {idx + 1}
              </div>
              <OverlayStepCard step={step} civ={civ} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
