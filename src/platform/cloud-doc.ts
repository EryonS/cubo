// A cloud document stores profile, settings and bests as JSON text: Firestore refuses arrays
// inside arrays and undefined values (legacy platform/cloud.js PACKED).
const PACKED = ['profile', 'settings', 'bests'] as const;

export function encodeDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const out: Record<string, unknown> = { ...doc };
  for (const k of PACKED) if (k in doc) out[k] = JSON.stringify(doc[k]);
  return out;
}

export function decodeDoc(data: Record<string, unknown>): Record<string, unknown> {
  try {
    const out: Record<string, unknown> = { ...data };
    for (const k of PACKED) if (typeof data[k] === 'string') out[k] = JSON.parse(data[k]);
    return out;
  } catch {
    return data;
  }
}
