import type { DepartmentRate } from "../types.ts";

export interface GlobalSettings {
  departmentRates: DepartmentRate[];
}

const GLOBAL_KEY = "bluelagoon_global_settings";
const canvasKey = (id: string) => `bluelagoon_canvas_${id}_settings`;

export const DEFAULT_DEPARTMENT_RATES: DepartmentRate[] = [
  { id: "dev",    name: "Dev",    ratePerManday: 10000, color: "#3B82F6" },
  { id: "design", name: "Design", ratePerManday: 8000,  color: "#EC4899" },
  { id: "qa",     name: "QA",     ratePerManday: 7000,  color: "#10B981" },
  { id: "pm",     name: "PM",     ratePerManday: 12000, color: "#F59E0B" },
  { id: "devops", name: "DevOps", ratePerManday: 11000, color: "#8B5CF6" },
];

export function loadGlobalSettings(): GlobalSettings {
  try {
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (raw) return JSON.parse(raw) as GlobalSettings;
  } catch {}
  return { departmentRates: DEFAULT_DEPARTMENT_RATES };
}

export function saveGlobalSettings(s: GlobalSettings): void {
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(s));
}

export function loadCanvasSettings(diagramId: string): Partial<GlobalSettings> | null {
  try {
    const raw = localStorage.getItem(canvasKey(diagramId));
    if (raw) return JSON.parse(raw) as Partial<GlobalSettings>;
  } catch {}
  return null;
}

export function saveCanvasSettings(diagramId: string, s: Partial<GlobalSettings>): void {
  localStorage.setItem(canvasKey(diagramId), JSON.stringify(s));
}

export function clearCanvasSettings(diagramId: string): void {
  localStorage.removeItem(canvasKey(diagramId));
}

export function hasCanvasOverride(diagramId: string): boolean {
  return localStorage.getItem(canvasKey(diagramId)) !== null;
}
