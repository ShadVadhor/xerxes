import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

/**
 * Serverless entry for Vercel (see scripts/vercel-build.mjs). It serves only the API:
 * the website itself is static. The contact form posts to /api/trpc/inquiry.submit.
 */
const app = express();
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default function handler(req: express.Request, res: express.Response) {
  return app(req, res);
}
