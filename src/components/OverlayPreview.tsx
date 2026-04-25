import type { BuildOrder } from "@/types/buildOrder";
import { getCiv } from "@/data/civs";
import OverlayStepCard from "@/components/OverlayStepCard";

type OverlayPreviewProps = {
  bo: BuildOrder;
};

const OverlayPreview = ({ bo }: OverlayPreviewProps) => {
  const civ = getCiv(bo.civilization);

  return (
    <section aria-label="Overlay preview" className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Preview
      </h2>

      {bo.steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No steps in this build yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {bo.steps.map((step, idx) => (
            <li key={step.id} className="max-w-[480px] space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Step {idx + 1}
              </div>
              <OverlayStepCard step={step} civ={civ} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default OverlayPreview;
