import { Router } from "express";
import { getMessage, listRecentMessages } from "../messageStore.js";

const router = Router();

router.get("/status/:id", (req, res) => {
  const msg = getMessage(req.params.id);
  if (!msg) return res.status(404).json({ error: "Unknown message id" });
  res.json(msg);
});

router.get("/messages", (req, res) => {
  res.json(listRecentMessages(Number(req.query.limit) || 50));
});

export default router;
