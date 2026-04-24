import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getCiv } from "@/data/civs";
import { createEmptyBuildOrder } from "@/lib/buildOrder";
import { saveBuildOrder, StorageQuotaError } from "@/lib/storage";

/**
 * Create-and-redirect: never a persistent page.
 * Reads `?civ=<id>`, mints a fresh build order, persists it, and forwards
 * to the editor at `/build/:id/edit`.
 */
const NewBuildOrder = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const civId = params.get("civ") ?? "";
    const civ = getCiv(civId);
    if (!civ) {
      navigate("/", { replace: true });
      return;
    }
    const bo = createEmptyBuildOrder(civ.id);
    try {
      saveBuildOrder(bo);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        toast.error(err.message);
      } else {
        toast.error("Could not create a new build. See the console for details.");
        console.error("[createEmptyBuildOrder]", err);
      }
      navigate("/library", { replace: true });
      return;
    }
    navigate(`/build/${bo.id}/edit`, { replace: true });
  }, [params, navigate]);

  return <main className="page-enter min-h-screen bg-background" />;
};

export default NewBuildOrder;
