// Canonical JSON for api-v0 section 3: sorted keys, no whitespace, integers only.

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

function render(value: unknown, path: string): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number': {
      if (!Number.isFinite(value)) throw new Error(`canonical: non-finite number at ${path}`);
      if (!Number.isInteger(value)) throw new Error(`canonical: float at ${path}`);
      if (Math.abs(value) > MAX_SAFE) throw new Error(`canonical: integer out of range at ${path}`);
      return JSON.stringify(value);
    }
    case 'object': {
      if (Array.isArray(value)) {
        return '[' + value.map((v, i) => render(v, `${path}[${i}]`)).join(',') + ']';
      }
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort();
      const parts: string[] = [];
      for (const k of keys) {
        if (!/^[\x00-\x7f]*$/.test(k)) throw new Error(`canonical: non-ASCII key at ${path}`);
        parts.push(JSON.stringify(k) + ':' + render(obj[k], `${path}.${k}`));
      }
      return '{' + parts.join(',') + '}';
    }
    default:
      throw new Error(`canonical: unsupported ${typeof value} at ${path}`);
  }
}

export function canonicalJson(value: unknown): string {
  return render(value, '$');
}
