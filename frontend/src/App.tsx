import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { PanelLeftOpen } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { TopBar } from "./components/TopBar.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { CanvasBoard } from "./components/CanvasBoard.tsx";
import { CostPanel } from "./components/panels/CostPanel.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { useCanvasStore } from "./store/canvasStore.ts";
import { useAutoSave } from "./hooks/useAutoSave.ts";
import { api } from "./lib/api.ts";
import type { AWSServiceType } from "./types.ts";

// ── Canvas route — loads diagram by :id or shows blank new canvas ──────────
function CanvasRoute() {
  const { id } = useParams<{ id?: string }>();
  const { loadDiagram } = useCanvasStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(true);

  const handleDragStart = useCallback((e: React.DragEvent, type: AWSServiceType) => {
    e.dataTransfer.setData("application/aws-service", type);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  // Load diagram on mount if id is a real UUID (not "new")
  useEffect(() => {
    if (id && id !== "new") {
      api.diagrams.get(id).then(d => loadDiagram(d)).catch(() => navigate("/dashboard"));
    }
  }, [id]);

  return (
    <div className="flex flex-1 min-h-0 relative">
      {showSidebar && (
        <Toolbar onDragStart={handleDragStart} onHide={() => setShowSidebar(false)} />
      )}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          title="Show sidebar"
          className="absolute left-2 top-3 z-10 flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}
      <CanvasBoard />
      <CostPanel />
    </div>
  );
}

// ── Shell wraps TopBar + page content ────────────────────────────────────────
function AppShell() {
  const navigate = useNavigate();
  const { status: saveStatus, lastSaved } = useAutoSave();

  const handleNew = useCallback(() => {
    useCanvasStore.setState({
      diagramId: null,
      diagramName: "Untitled Project",
      nodes: [],
      edges: [],
      stickyNotes: [],
      additionalCosts: [],
      subscriptions: [],
      sellingPriceUSD: 0,
      selectedNodeId: null,
    });
    navigate("/canvas/new");
  }, [navigate]);

  return (
    <div className="flex flex-col h-full w-full">
      <TopBar onNew={handleNew} saveStatus={saveStatus} lastSaved={lastSaved} />
      <Routes>
        <Route path="/dashboard" element={
          <DashboardPage
            onOpenCanvas={(id) => navigate(`/canvas/${id}`)}
            onNewCanvas={handleNew}
          />
        } />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/canvas/new" element={<CanvasRoute />} />
        <Route path="/canvas/:id" element={<CanvasRoute />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ReactFlowProvider>
        <AppShell />
      </ReactFlowProvider>
    </BrowserRouter>
  );
}
