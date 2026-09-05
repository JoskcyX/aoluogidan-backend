import slugify from "slugify";

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

/**
 * Given a desired base slug and a lookup function that checks whether a
 * candidate slug is already taken (excluding the current record when
 * editing), returns a guaranteed-unique slug by appending -2, -3, etc.
 */
export async function ensureUniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = toSlug(base) || "item";
  let candidate = baseSlug;
  let counter = 2;

  while (await isTaken(candidate)) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}
