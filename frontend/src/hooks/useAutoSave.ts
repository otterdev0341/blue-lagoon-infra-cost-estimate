import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore.ts";
import { api } from "../lib/api.ts";

const DEBOUNCE_MS = 2500; // 2.5s after last change

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export function useAutoSave() {
  const { diagramId, nodes, edges, stickyNotes, departmentRates } = useCanvasStore();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip marking unsaved on the very first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!diagramId) return;

    // Mark as unsaved immediately when canvas changes
    setStatus("unsaved");

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await api.diagrams.saveCanvas(diagramId, nodes, edges, stickyNotes, departmentRates);
        setStatus("saved");
        setLastSaved(new Date());
        // Return to idle after a few seconds so the indicator fades
        setTimeout(() => setStatus("idle"), 3000);
      } catch (err) {
        console.error("[auto-save]", err);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [diagramId, nodes, edges, stickyNotes, departmentRates]);

  return { status, lastSaved };
}
