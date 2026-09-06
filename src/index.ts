import "dotenv/config";
import express from "express";
import "express-async-errors";
import cors from "cors";
import path from "path";

import authRoutes from "@/routes/auth";
import publicRoutes from "@/routes/public";
import adminRoutes from "@/routes/admin";

const app = express();

// Allow only the configured frontend origin(s) to call this API with
// credentials. Set FRONTEND_ORIGIN to your Netlify site's URL (and any
// preview-deploy URLs you want to allow, comma-separated).
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Only relevant if STORAGE_DRIVER=local — serves uploaded files back out.
// On Render this directory does not persist across deploys/restarts;
// switch STORAGE_DRIVER to "s3" for anything beyond local testing.
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

// Central error handler — makes sure an unexpected throw in any route
// (a bad DB query, etc.) still comes back as JSON instead of crashing
// the request with an HTML stack trace.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

// Belt-and-braces: log and keep running instead of letting the whole
// process die if something throws outside of an Express request (Node 15+
// terminates on an unhandled rejection by default). `express-async-errors`
// above already covers ordinary route errors; this just makes sure a
// one-off bug anywhere else can't take the whole site down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
