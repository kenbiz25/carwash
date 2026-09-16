import { Router } from "express";
import { getTransaction } from "../transactionStore.js";

const router = Router();

router.get("/status/:checkoutRequestId", (req, res) => {
  const txn = getTransaction(req.params.checkoutRequestId);
  if (!txn) return res.status(404).json({ error: "Unknown checkoutRequestId" });
  res.json(txn);
});

export default router;
