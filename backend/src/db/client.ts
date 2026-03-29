/**
 * Database client initialiser.
 *
 * - When MONGODB_URI is set  → connects to MongoDB via Mongoose (production)
 * - When MONGODB_URI is absent → uses bun:sqlite (local development, zero config)
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

export const useMongo = Boolean(uri);

let _connected = false;

export async function connectDB(): Promise<void> {
  if (!useMongo) {
    // SQLite path — client is initialised lazily by sqliteClient.ts
    return;
  }
  if (_connected) return;
  await mongoose.connect(uri!, { dbName: process.env.MONGODB_DB ?? "infra_canvas" });
  _connected = true;
  console.log(`[db] MongoDB connected → ${process.env.MONGODB_DB ?? "infra_canvas"}`);
}

export { mongoose };
