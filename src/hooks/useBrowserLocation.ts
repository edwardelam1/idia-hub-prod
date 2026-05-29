import { useEffect, useState } from "react";

export type BrowserLocationStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unavailable";

interface BrowserLocationState {
  locationString: string | undefined;
  status: BrowserLocationStatus;
  error: string | null;
}

const SESSION_KEY = "idia.browserLocation";

function slug(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  return ascii.length ? ascii : undefined;
}

function buildLocationString(parts: {
  city?: string | null;
  subdivisionCode?: string | null;
  subdivisionName?: string | null;
  countryCode?: string | null;
}): string | undefined {
  const country = parts.countryCode?.trim().toUpperCase() || undefined;

  // principalSubdivisionCode is e.g. "US-TX" — strip the country prefix.
  let region: string | undefined;
  const code = parts.subdivisionCode?.trim();
  if (code) {
    const tail = code.includes("-") ? code.split("-").pop() : code;
    region = slug(tail)?.toUpperCase();
  }
  if (!region) region = slug(parts.subdivisionName)?.toUpperCase();

  const city = slug(parts.city);

  const segments = [city, region, country].filter(Boolean) as string[];
  return segments.length ? segments.join("-") : undefined;
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | undefined> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
  const data = await res.json();
  return buildLocationString({
    city: data.city || data.locality,
    subdivisionCode: data.principalSubdivisionCode,
    subdivisionName: data.principalSubdivision,
    countryCode: data.countryCode,
  });
}

export function useBrowserLocation(): BrowserLocationState {
  const [state, setState] = useState<BrowserLocationState>(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { locationString?: string };
        if (parsed.locationString) {
          return { locationString: parsed.locationString, status: "ready", error: null };
        }
      }
    } catch {}
    return { locationString: undefined, status: "idle", error: null };
  });

  useEffect(() => {
    if (state.status === "ready") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ locationString: undefined, status: "unavailable", error: "Geolocation API unavailable" });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, status: "requesting" }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const locationString = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (cancelled) return;
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ locationString }));
          } catch {}
          setState({ locationString, status: "ready", error: null });
        } catch (err) {
          if (cancelled) return;
          setState({
            locationString: undefined,
            status: "unavailable",
            error: err instanceof Error ? err.message : "Reverse geocode failed",
          });
        }
      },
      (err) => {
        if (cancelled) return;
        const denied = err.code === err.PERMISSION_DENIED;
        setState({
          locationString: undefined,
          status: denied ? "denied" : "unavailable",
          error: err.message,
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}