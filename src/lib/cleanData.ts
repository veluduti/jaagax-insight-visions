/**
 * Recursively clean data:
 * - Remove null
 * - Remove undefined
 * - Remove empty strings
 * - Remove empty arrays
 * - Remove empty objects
 * - Remove objects where all values are false
 */
export function cleanData<T = any>(input: T): any {
  if (input === null || input === undefined) return undefined;

  if (Array.isArray(input)) {
    const arr = input
      .map((item) => cleanData(item))
      .filter((item) => item !== undefined);
    return arr.length === 0 ? undefined : arr;
  }

  if (typeof input === "object") {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      const cleaned = cleanData(value);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    const values = Object.values(out);
    if (values.length === 0) return undefined;
    // If every value is strictly false, drop the object
    if (values.every((v) => v === false)) return undefined;
    return out;
  }

  if (typeof input === "string") {
    return input.trim() === "" ? undefined : input;
  }

  return input;
}

export default cleanData;
