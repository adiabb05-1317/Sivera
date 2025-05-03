"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create a PostgreSQL connection
const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString);

// Create a Drizzle ORM instance
export const db = drizzle(client, { schema });
