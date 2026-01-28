/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Sort locations by distance from a reference point
 */
export function sortByDistance<T extends { lat: number; lng: number }>(
  locations: T[],
  refLat: number,
  refLng: number
): (T & { distance: number })[] {
  return locations
    .map((loc) => ({
      ...loc,
      distance: calculateDistance(refLat, refLng, loc.lat, loc.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter locations within a radius
 */
export function filterByRadius<T extends { lat: number; lng: number }>(
  locations: T[],
  refLat: number,
  refLng: number,
  radiusKm: number
): (T & { distance: number })[] {
  return sortByDistance(locations, refLat, refLng).filter(
    (loc) => loc.distance <= radiusKm
  );
}
