// Split out from lib/documents.ts because that file imports the Prisma
// client (and transitively `pg`, a Node-only module) — importing it from a
// client component breaks the browser bundle. This file has no such import,
// so client components can safely use it.
export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}
