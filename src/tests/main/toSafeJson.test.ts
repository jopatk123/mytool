import { describe, expect, it, vi } from 'vitest';
import { toSafeJson } from '../../main/utils/toSafeJson';

describe('toSafeJson', () => {
  it('returns primitives unchanged', () => {
    expect(toSafeJson('hello')).toBe('hello');
    expect(toSafeJson(42)).toBe(42);
    expect(toSafeJson(true)).toBe(true);
    expect(toSafeJson(null)).toBeNull();
    expect(toSafeJson(undefined)).toBeUndefined();
  });

  it('limits arrays to the first five elements', () => {
    const array = [1, 2, 3, 4, 5, 6, 7];
    const result = toSafeJson(array);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(5);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles circular references gracefully', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const result = toSafeJson(circular);
    expect(result).toEqual({ type: 'UnserializableObject' });
  });

  it('stringifies rare primitive types', () => {
    expect(toSafeJson(Symbol('id'))).toBe('Symbol(id)');
    expect(toSafeJson(BigInt(1))).toBe('1');
  });

  it('labels functions explicitly', () => {
    const fn = vi.fn();
    expect(toSafeJson(fn)).toBe('[Function]');
  });
});
