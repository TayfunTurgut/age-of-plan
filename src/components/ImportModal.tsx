import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveBuildOrder, StorageQuotaError } from "@/lib/storage";
import {
  extractAoe4GuidesId,
  fetchAoe4GuidesBuild,
} from "@/lib/importAoe4Guides";
import { parseRtsOverlayJson } from "@/lib/importRtsOverlay";
import type { BuildOrder, BuildStep } from "@/types/buildOrder";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCivId?: string;
};

/** Detect a build that came out of our own native exporter. */
const looksLikeNativeExport = (v: unknown): v is BuildOrder => {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || !Array.isArray(o.steps)) return false;
  return (o.steps as unknown[]).every(
    (s) => s && typeof s === "object" && typeof (s as { id?: unknown }).id === "string",
  );
};

/** Regenerate UUIDs and stamps so re-importing our own export doesn't
 *  collide with the original in localStorage. */
const reseedNative = (bo: BuildOrder): BuildOrder => {
  const now = Date.now();
  const steps: BuildStep[] = bo.steps.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
    resources: { ...s.resources },
    notes: s.notes.map((n) => ({ id: crypto.randomUUID(), text: n.text })),
  }));
  return { ...bo, id: crypto.randomUUID(), createdAt: now, updatedAt: now, steps };
};

export const ImportModal = ({ open, onOpenChange, presetCivId }: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"aoe4guides" | "json">("aoe4guides");
  const [urlInput, setUrlInput] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setUrlInput("");
    setJsonInput("");
    setError(null);
    setLoading(false);
    setDragActive(false);
  }, [open]);

  const applyImport = (bo: BuildOrder) => {
    if (presetCivId) {
      bo.civilization = presetCivId;
    } else if (bo.civilization === "unknown") {
      toast.warning("Could not detect civilization. Please set it manually after import.");
    }
    try {
      saveBuildOrder(bo);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setError(err.message);
      } else {
        setError("Could not save the imported build. See the console for details.");
        console.error("[saveBuildOrder]", err);
      }
      return;
    }
    toast.success("Build imported successfully");
    onOpenChange(false);
    navigate(`/build/${bo.id}/edit`);
  };

  const handleAoe4GuidesImport = async () => {
    setError(null);
    const id = extractAoe4GuidesId(urlInput);
    if (!id) {
      setError("Couldn't parse a build ID from that input.");
      return;
    }
    setLoading(true);
    try {
      const bo = await fetchAoe4GuidesBuild(id);
      applyImport(bo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  };

  const handleJsonImport = () => {
    setError(null);
    const text = jsonInput.trim();
    if (!text) {
      setError("Paste JSON or drop a file first.");
      return;
    }

    // Try RTS_Overlay shape first.
    let rtsErr: Error | null = null;
    try {
      const bo = parseRtsOverlayJson(text);
      applyImport(bo);
      return;
    } catch (err) {
      rtsErr = err instanceof Error ? err : new Error(String(err));
    }

    // Fall back to our own native export shape. Track its failure reason
    // separately so the user sees *why* both attempts failed.
    let nativeErr: string;
    try {
      const parsed = JSON.parse(text);
      if (looksLikeNativeExport(parsed)) {
        applyImport(reseedNative(parsed));
        return;
      }
      nativeErr = "not a native Age of Plan export";
    } catch (err) {
      nativeErr = `invalid JSON — ${err instanceof Error ? err.message : "unknown error"}`;
    }

    const rtsMsg = rtsErr?.message ?? "unknown error";
    setError(
      `Couldn't import this. As RTS_Overlay: ${rtsMsg}. As native export: ${nativeErr}.`,
    );
  };

  const readFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setJsonInput(result);
    };
    reader.onerror = () => setError("Could not read file.");
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Import build order</DialogTitle>
          <DialogDescription>
            Pull a build from aoe4guides.com or paste any RTS_Overlay-formatted JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "aoe4guides" | "json")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="aoe4guides">From aoe4guides.com</TabsTrigger>
            <TabsTrigger value="json">From JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="aoe4guides" className="space-y-3">
            <Input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && urlInput.trim()) {
                  e.preventDefault();
                  void handleAoe4GuidesImport();
                }
              }}
              placeholder="Paste aoe4guides.com URL or build ID"
              disabled={loading}
            />
            <Button
              onClick={handleAoe4GuidesImport}
              disabled={loading || !urlInput.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="json" className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload JSON file — press Enter to browse, or drop a file here"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) readFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "focus-ring flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-sm text-muted-foreground transition-colors",
                dragActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/60 hover:text-foreground",
              )}
            >
              <Download className="h-4 w-4" />
              <span>Tap to browse or drop a .json or .bo file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.bo,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <Textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError(null);
              }}
              placeholder="Paste RTS_Overlay or exported JSON here"
              rows={8}
              className="font-mono text-xs"
            />
            <Button
              onClick={handleJsonImport}
              disabled={!jsonInput.trim()}
              className="w-full"
            >
              Import
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
