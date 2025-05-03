import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

/** @type {import('drizzle-kit').Config} */
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
};
