/**
 * Mongoose models — replaces Drizzle/SQLite schema.
 * JSON columns → native BSON objects (no serialisation).
 */
import { Schema, model, Document } from "mongoose";

// ── Diagrams ─────────────────────────────────────────────────────────────────

export interface IDiagram extends Document {
  _id: string;
  name: string;
  description?: string;
  region: string;
  billingModel: "ondemand" | "reserved1yr" | "reserved3yr" | "spot";
  nodes: unknown[];
  edges: unknown[];
  stickyNotes: unknown[];
  departmentRates: unknown[];
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

const diagramSchema = new Schema<IDiagram>(
  {
    _id:            { type: String, required: true },
    name:           { type: String, required: true },
    description:    String,
    region:         { type: String, default: "us-east-1" },
    billingModel:   {
      type: String,
      enum: ["ondemand", "reserved1yr", "reserved3yr", "spot"],
      default: "ondemand",
    },
    nodes:           { type: Schema.Types.Mixed, default: [] },
    edges:           { type: Schema.Types.Mixed, default: [] },
    stickyNotes:     { type: Schema.Types.Mixed, default: [] },
    departmentRates: { type: Schema.Types.Mixed, default: [] },
    isTemplate:      { type: Boolean, default: false },
  },
  {
    timestamps: true,         // auto-manages createdAt / updatedAt
    _id: false,               // we supply our own UUID string _id
    toJSON: { virtuals: true },
  }
);

export const DiagramModel = model<IDiagram>("Diagram", diagramSchema);

// ── Snapshots ─────────────────────────────────────────────────────────────────
// Kept as a separate collection (easier to query/cap independently).

export interface ISnapshot extends Document {
  _id: string;
  diagramId: string;
  label?: string;
  nodes: unknown[];
  edges: unknown[];
  stickyNotes: unknown[];
  createdAt: string;
}

const snapshotSchema = new Schema<ISnapshot>(
  {
    _id:        { type: String, required: true },
    diagramId:  { type: String, required: true, index: true },
    label:      String,
    nodes:      { type: Schema.Types.Mixed, default: [] },
    edges:      { type: Schema.Types.Mixed, default: [] },
    stickyNotes:{ type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false }
);

export const SnapshotModel = model<ISnapshot>("DiagramSnapshot", snapshotSchema);

// ── Pricing Cache ─────────────────────────────────────────────────────────────

export interface IPricingCache extends Document {
  service: string;
  region: string;
  data: unknown;
  fetchedAt: Date;
  ttlHours: number;
}

const pricingCacheSchema = new Schema<IPricingCache>({
  service:   { type: String, required: true },
  region:    { type: String, required: true },
  data:      Schema.Types.Mixed,
  fetchedAt: { type: Date, default: Date.now },
  ttlHours:  { type: Number, default: 24 },
});

pricingCacheSchema.index({ service: 1, region: 1 }, { unique: true });

export const PricingCacheModel = model<IPricingCache>("PricingCache", pricingCacheSchema);
