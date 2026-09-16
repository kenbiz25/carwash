import { Router } from "express";
import { parseCallbackMetadata } from "../darajaClient.js";
import { completeTransaction, failTransaction } from "../transactionStore.js";

const router = Router();

// Safaricom calls this - it is never called by the frontend directly. Must
// always respond 200 with ResultCode 0 quickly, or Safaricom will retry.
router.post("/callback", (req, res) => {
  try {
    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) {
      console.warn("[mpesa-server] Callback with unexpected shape:", JSON.stringify(req.body));
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    if (ResultCode === 0) {
      const { amount, mpesaReceipt, transactionDate, phoneNumber } = parseCallbackMetadata(CallbackMetadata?.Item);
      completeTransaction(CheckoutRequestID, { amount, mpesaReceipt, transactionDate, phoneNumber });
      console.log(`[mpesa-server] Payment confirmed: ${CheckoutRequestID} -> receipt ${mpesaReceipt}`);
    } else {
      failTransaction(CheckoutRequestID, ResultDesc);
      console.log(`[mpesa-server] Payment failed/cancelled: ${CheckoutRequestID} -> ${ResultDesc}`);
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("[mpesa-server] Error handling callback:", err.message);
    // Still acknowledge - an error on our side shouldn't make Safaricom hammer retries.
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

export default router;
