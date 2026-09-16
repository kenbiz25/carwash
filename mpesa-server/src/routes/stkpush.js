import { Router } from "express";
import { config } from "../config.js";
import { initiateStkPush } from "../darajaClient.js";
import { createTransaction, completeTransaction } from "../transactionStore.js";

const router = Router();

function mockReceipt() {
  return "MOCK" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

router.post("/stkpush", async (req, res) => {
  const { phone, amount, accountReference, transactionDesc, meta } = req.body || {};

  if (!phone || !amount) {
    return res.status(400).json({ error: "phone and amount are required" });
  }

  try {
    if (config.isMock) {
      // Simulates Safaricom: hand back a fake CheckoutRequestID immediately,
      // then "complete" it a few seconds later exactly like a real callback
      // would - so the frontend's poll-until-done logic doesn't need to know
      // or care whether it's talking to the real thing yet.
      const checkoutRequestId = `ws_CO_mock_${Date.now()}`;
      createTransaction(checkoutRequestId, {
        phone,
        amount,
        accountReference,
        transactionDesc,
        meta: meta || {},
        source: "mock",
      });

      setTimeout(() => {
        completeTransaction(checkoutRequestId, {
          mpesaReceipt: mockReceipt(),
          transactionDate: new Date().toISOString(),
          phoneNumber: phone,
          amount,
        });
      }, 4000);

      return res.json({
        checkoutRequestId,
        merchantRequestId: `mock-${Date.now()}`,
        customerMessage: "Success. Request accepted for processing (mock mode).",
      });
    }

    const result = await initiateStkPush({ phone, amount, accountReference, transactionDesc });
    createTransaction(result.CheckoutRequestID, {
      phone,
      amount,
      accountReference,
      transactionDesc,
      meta: meta || {},
      merchantRequestId: result.MerchantRequestID,
      source: "daraja",
    });

    res.json({
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      customerMessage: result.CustomerMessage,
    });
  } catch (err) {
    console.error("[mpesa-server] STK push failed:", err.message);
    res.status(502).json({ error: err.message });
  }
});

export default router;
