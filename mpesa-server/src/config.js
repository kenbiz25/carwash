import "dotenv/config";

const MPESA_ENV = process.env.MPESA_ENV || "mock";

const DARAJA_BASE_URL = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
}[MPESA_ENV];

export const config = {
  mpesaEnv: MPESA_ENV, // "mock" | "sandbox" | "production"
  isMock: MPESA_ENV === "mock",
  darajaBaseUrl: DARAJA_BASE_URL || null,
  consumerKey: process.env.MPESA_CONSUMER_KEY || "",
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
  shortcode: process.env.MPESA_SHORTCODE || "174379",
  passkey: process.env.MPESA_PASSKEY || "",
  // "CustomerBuyGoodsOnline" for a Till number, "CustomerPayBillOnline" for a Paybill.
  // Defaults to Paybill because that's what Safaricom's shared sandbox test
  // shortcode (174379) is documented as - set MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline
  // once MPESA_SHORTCODE is switched to the business's real till number.
  transactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
  callbackUrl: process.env.MPESA_CALLBACK_URL || "",
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5183",
};

if (!config.isMock) {
  const missing = ["consumerKey", "consumerSecret", "passkey", "callbackUrl"].filter(
    (key) => !config[key] || config[key].startsWith("REPLACE_WITH") || config[key].startsWith("https://your-")
  );
  if (missing.length) {
    console.warn(
      `[mpesa-server] MPESA_ENV=${MPESA_ENV} but these still look like placeholders: ${missing.join(", ")}. ` +
      "STK pushes will fail against Safaricom until real values are set in .env."
    );
  }
}
