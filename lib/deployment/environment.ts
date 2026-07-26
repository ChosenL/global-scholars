import "server-only";

export type EnvironmentCheck = {
  name: string;
  configured: boolean;
  scope: "public" | "server";
  requiredFor: "all" | "ai";
};

export function getEnvironmentChecks(): EnvironmentCheck[] {
  return [
    { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", configured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), scope: "public", requiredFor: "all" },
    { name: "CLERK_SECRET_KEY", configured: Boolean(process.env.CLERK_SECRET_KEY), scope: "server", requiredFor: "all" },
    { name: "NEXT_PUBLIC_SUPABASE_URL", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), scope: "public", requiredFor: "all" },
    {
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      scope: "public",
      requiredFor: "all",
    },
    { name: "OPENAI_API_KEY", configured: Boolean(process.env.OPENAI_API_KEY), scope: "server", requiredFor: "ai" },
    { name: "OPENAI_SAFETY_SALT", configured: Boolean(process.env.OPENAI_SAFETY_SALT), scope: "server", requiredFor: "ai" },
  ];
}

export function isCoreEnvironmentReady(): boolean {
  return getEnvironmentChecks()
    .filter((check) => check.requiredFor === "all")
    .every((check) => check.configured);
}
