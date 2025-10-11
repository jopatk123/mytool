/**
 * Converts unknown values into a JSON-safe representation so that they can be logged without
 * risking serialization errors. Complex objects are truncated or stringified in a defensive way.
 */
export const toSafeJson = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 5).map(item => toSafeJson(item));
  }
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return { type: 'UnserializableObject' };
    }
  }
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[Function]';

  try {
    return Object.prototype.toString.call(value);
  } catch {
    return '[Unserializable]';
  }
};

export type ToSafeJson = typeof toSafeJson;
