import { Router } from "express";
import { authenticate, issueSessionToken, getClientIp } from "@/auth";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const ip = getClientIp(req);
  const result = await authenticate(email, password, ip);

  if ("error" in result) {
    return res.status(result.status).json({ error: result.error });
  }

  const token = await issueSessionToken(result.user);
  res.json({ token, user: result.user });
});

export default router;
