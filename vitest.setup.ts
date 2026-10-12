import { vi } from "vitest";

/* src/lib/db.ts throws at import time without MONGODB_URI, and secretBox needs
   a key. Nothing here opens a connection; DB-backed tests set their own URI. */
vi.stubEnv("MONGODB_URI", process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/trackmyself-test");
vi.stubEnv("NEXTAUTH_SECRET", "test-secret-not-for-production-use-0001");
vi.stubEnv("AI_KEY_SECRET", "test-ai-key-secret-32-chars-long-xx");
vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
