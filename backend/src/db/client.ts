/**
 * MongoDB client via Mongoose.
 * Replaces bun:sqlite + Drizzle for production.
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI environment variable is required");

let _connected = false;

export async function connectDB(): Promise<void> {
  if (_connected) return;
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? "infra_canvas" });
  _connected = true;
  console.log(`[db] MongoDB connected → ${process.env.MONGODB_DB ?? "infra_canvas"}`);
}

export { mongoose };
