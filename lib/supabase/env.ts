const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireValue(
  value: string | undefined,
  variableName: string,
): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`${variableName} is missing.`);
  }

  return normalizedValue;
}

function requireUrl(value: string | undefined): string {
  const normalizedValue = requireValue(
    value,
    "NEXT_PUBLIC_SUPABASE_URL",
  );

  try {
    return new URL(normalizedValue).toString().replace(/\/$/, "");
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.",
    );
  }
}

export const supabaseEnv = Object.freeze({
  url: requireUrl(supabaseUrl),
  publishableKey: requireValue(
    supabasePublishableKey,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ),
});
