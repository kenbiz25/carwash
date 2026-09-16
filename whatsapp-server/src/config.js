import "dotenv/config";

const WHATSAPP_ENV = process.env.WHATSAPP_ENV || "mock";

export const config = {
  whatsappEnv: WHATSAPP_ENV, // "mock" | "live"
  isMock: WHATSAPP_ENV !== "live",
  graphBaseUrl: "https://graph.facebook.com/v19.0",
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
  port: Number(process.env.PORT) || 4031,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5183",
};

if (!config.isMock) {
  const missing = ["accessToken", "phoneNumberId", "webhookVerifyToken"].filter(
    (key) => !config[key] || config[key].startsWith("REPLACE_WITH")
  );
  if (missing.length) {
    console.warn(
      `[whatsapp-server] WHATSAPP_ENV=live but these still look like placeholders: ${missing.join(", ")}. ` +
      "Sends will fail against Meta until real values are set in .env."
    );
  }
}
