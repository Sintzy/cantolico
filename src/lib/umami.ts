export type UmamiEventData = Record<string, string | number | boolean | null | undefined>;

function getUmami() {
  if (typeof window === 'undefined') return null;
  return (window as any).umami;
}

function sanitizeEventData(data?: UmamiEventData) {
  if (!data) return undefined;
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function trackEvent(eventName: string, data?: UmamiEventData) {
  try {
    const umami = getUmami();
    if (!umami) return;

    const payload = sanitizeEventData(data);

    if (typeof umami.track === 'function') {
      umami.track(eventName, payload);
      return;
    }

    if (typeof umami === 'function') {
      umami(eventName, payload);
    }
  } catch {
    // no-op: tracking failures should never break UX
  }
}
