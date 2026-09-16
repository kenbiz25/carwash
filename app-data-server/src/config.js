import "dotenv/config";

export const config = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
  },
  projectId: process.env.FIREBASE_PROJECT_ID || "carwash-managerke",
  port: Number(process.env.PORT) || 4051,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5183",
  // Off by default so a fresh production database stays genuinely empty -
  // set to "true" only for a throwaway QA/staging database where the demo
  // Njiru/Kayole/Utawala dataset is actually wanted.
  seedDemoData: process.env.SEED_DEMO_DATA === "true",
  // Powers the "scan vehicle photo" auto-fill on check-in (see
  // src/routes/vision.js) - a paid OpenAI key, never shipped to the browser.
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  // Accepts OPENAI_MODEL too, since that's the name people naturally reach
  // for first (it's what other tools call it) - OPENAI_VISION_MODEL wins if
  // both are set.
  openaiVisionModel: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
};

export const hasDbConfig = Boolean(config.db.database && config.db.user);
export const hasOpenAiKey = Boolean(config.openaiApiKey);

if (!hasDbConfig) {
  console.warn(
    "[app-data-server] No DB_NAME/DB_USER set yet - every request will fail until you " +
    "create the database in cPanel and fill in .env. See env.example."
  );
}
