import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\//.test(value), {
    message: "Must be a valid http(s) URL",
  })
  .optional()
  .default("");

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().optional().default(""),
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional().default(""),
  PAYMENT_WEBHOOK_SECRET: z.string().trim().optional().default(""),
  CRON_SECRET: z.string().trim().optional().default(""),
  ADMIN_BOOTSTRAP_EMAIL: z.string().trim().toLowerCase().optional().default(""),
});

export type AppEnv = z.infer<typeof schema>;

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL,
});

if (!parsed.success && process.env.NODE_ENV !== "production") {
  console.warn(
    "[tickora] Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env: AppEnv = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SITE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      PAYMENT_WEBHOOK_SECRET: "",
      CRON_SECRET: "",
      ADMIN_BOOTSTRAP_EMAIL: "",
    };

export const siteUrl =
  env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True only when both public Supabase values are present. The application
 * deliberately stays runnable without credentials: public discovery falls back
 * to a clearly labelled, read-only sample catalogue and authenticated flows
 * explain how to finish setup. It never pretends a backend exists.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
}

export function getServiceRoleKey(): string {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for this server-side operation.",
    );
  }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}
