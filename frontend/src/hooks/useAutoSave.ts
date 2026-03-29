import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore.ts";
import { api } from "../lib/api.ts";

const DEBOUNCE_MS = 2500; // 2.5s after last change

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export function useAutoSave() {
  const {
    diagramId, nodes, edges, stickyNotes,
    departmentRates, additionalCosts, subscriptions,
    sellingPriceUSD, year2SellingPriceUSD, monthlyChargeUSD,
  } = useCanvasStore();

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const hasPending = useRef(false);

  // Always keep latest values in a ref so unmount flush uses current data
  const latestRef = useRef({
    diagramId, nodes, edges, stickyNotes,
    departmentRates, additionalCosts, subscriptions,
    sellingPriceUSD, year2SellingPriceUSD, monthlyChargeUSD,
  });
  useEffect(() => {
    latestRef.current = {
      diagramId, nodes, edges, stickyNotes,
      departmentRates, additionalCosts, subscriptions,
      sellingPriceUSD, year2SellingPriceUSD, monthlyChargeUSD,
    };
  });

  // Flush save immediately on unmount if there's a pending write
  useEffect(() => {
    return () => {
      if (hasPending.current) {
        const d = latestRef.current;
        if (!d.diagramId) return;
        api.diagrams.saveCanvas(
          d.diagramId, d.nodes, d.edges, d.stickyNotes,
          d.departmentRates, d.additionalCosts, d.subscriptions,
          d.sellingPriceUSD, d.year2SellingPriceUSD, d.monthlyChargeUSD,
        ).catch(err => console.error("[auto-save unmount]", err));
      }
    };
  }, []); // runs only on unmount

  useEffect(() => {
    // Skip marking unsaved on the very first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!diagramId) return;

    // Mark as unsaved immediately when canvas changes
    setStatus("unsaved");
    hasPending.current = true;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      hasPending.current = false;
      setStatus("saving");
      try {
        const d = latestRef.current;
        await api.diagrams.saveCanvas(
          d.diagramId!, d.nodes, d.edges, d.stickyNotes,
          d.departmentRates, d.additionalCosts, d.subscriptions,
          d.sellingPriceUSD, d.year2SellingPriceUSD, d.monthlyChargeUSD,
        );
        setStatus("saved");
        setLastSaved(new Date());
        setTimeout(() => setStatus("idle"), 3000);
      } catch (err) {
        console.error("[auto-save]", err);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [diagramId, nodes, edges, stickyNotes, departmentRates, additionalCosts, subscriptions, sellingPriceUSD, year2SellingPriceUSD, monthlyChargeUSD]);

  return { status, lastSaved };
}
