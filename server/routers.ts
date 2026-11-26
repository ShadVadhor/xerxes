import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createInquiry } from "./db";

const inquiryInput = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(160),
  organization: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().email("Please enter a valid email").max(320),
  interest: z.string().trim().min(2).max(80),
  message: z.string().trim().max(4000).optional().default(""),
  source: z.string().trim().max(80).optional().default("contact"),
  /** Honeypot — must stay empty */
  website: z.string().max(0).optional().default(""),
});

/** Small in-memory throttle: 5 submissions per IP per 10 minutes (per instance). */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();
function throttled(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
    });
  }
  return false;
}
/** Log only a fixed message and a short error code — never the raw error, which may embed submitted PII. */
function safeCode(error: unknown): string {
  const code = (error as { code?: unknown; cause?: { code?: unknown } } | null)?.code ?? (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof code === "string" ? code.slice(0, 40) : "unknown";
}
export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  inquiry: router({
    submit: publicProcedure.input(inquiryInput).mutation(async ({ input, ctx }) => {
      const forwarded = String(ctx.req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
      const ip = forwarded || ctx.req.ip || "unknown";
      if (throttled(ip)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many messages from this connection. Please try again shortly, or email contact@geios.energy.",
        });
      }
      const record = {
        name: input.name,
        organization: input.organization || null,
        email: input.email,
        interest: input.interest,
        message: input.message || null,
        source: input.source || "contact",
      };

      let stored = false;
      try {
        stored = await createInquiry(record);
      } catch (error) {
        console.error("[Inquiry] Failed to store inquiry, code:", safeCode(error));
      }

      let notified = false;
      try {
        notified = await notifyOwner({
          title: `New Xerxes inquiry — ${input.interest}`,
          content: [
            `Name: ${input.name}`,
            `Organisation: ${input.organization || "—"}`,
            `Email: ${input.email}`,
            `Interest: ${input.interest}`,
            `Source: ${input.source || "contact"}`,
            "",
            input.message || "(no message)",
          ].join("\n"),
        });
      } catch (error) {
        console.error("[Inquiry] Owner notification failed, code:", safeCode(error));
      }

      if (!stored && !notified) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not send your message right now. Please email contact@geios.energy.",
        });
      }

      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
