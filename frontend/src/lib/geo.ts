const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak antara dua koordinat GPS dalam satuan kilometer (rumus Haversine).
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = EARTH_RADIUS_KM * c;

  return Math.round(distanceKm * 10) / 10;
}

export const haversineKm = haversine;

/**
 * Memformat angka kilometer ke tampilan bahasa Indonesia (contoh: "0,8 km dari lokasi Anda").
 */
export function formatDistanceKm(distanceKm: number): string {
  const formatted = distanceKm.toFixed(1).replace(".", ",");
  return `${formatted} km dari lokasi Anda`;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    village?: string;
    city_district?: string;
    city?: string;
    town?: string;
    county?: string;
  };
}

/**
 * Mengambil nama jalan/alamat singkat dari koordinat menggunakan Nominatim OpenStreetMap.
 * Best-effort: bila gagal atau diblokir jaringan, mengembalikan string kosong tanpa melempar error.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "id,en",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return "";
    }

    const data = (await res.json()) as NominatimReverseResponse;
    if (data.address) {
      const parts: string[] = [];
      if (data.address.road) {
        parts.push(
          data.address.house_number
            ? `${data.address.road} No. ${data.address.house_number}`
            : data.address.road
        );
      }
      const area =
        data.address.suburb ||
        data.address.village ||
        data.address.city_district;
      if (area) {
        parts.push(`Kel. ${area}`);
      }
      const city =
        data.address.city || data.address.town || data.address.county;
      if (city) {
        parts.push(city);
      }

      if (parts.length > 0) {
        return parts.join(", ").slice(0, 255);
      }
    }

    if (data.display_name) {
      return data.display_name
        .split(",")
        .slice(0, 3)
        .map((s) => s.trim())
        .join(", ")
        .slice(0, 255);
    }

    return "";
  } catch {
    return "";
  } finally {
    window.clearTimeout(timeoutId);
  }
}
