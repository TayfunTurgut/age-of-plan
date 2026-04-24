import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCiv } from "@/data/civs";
import { createEmptyBuildOrder } from "@/lib/buildOrder";
import { saveBuildOrder } from "@/lib/storage";

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
    saveBuildOrder(bo);
    navigate(`/build/${bo.id}/edit`, { replace: true });
  }, [params, navigate]);

  return <main className="min-h-screen bg-background" />;
};

export default NewBuildOrder;
