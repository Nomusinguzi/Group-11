/**
 * Haversine distance calculation - single source of truth for distance
 * ranking used by GET /clinics/nearby, POST /sos, and the USSD handler.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in kilometers
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Sorts a list of clinics by distance from a given point.
 * Each clinic must have numeric `lat` and `lng` fields.
 * Adds a `distance_km` field (rounded to 2 decimals) to each result.
 *
 * @param {Array} clinics
 * @param {number} lat
 * @param {number} lng
 * @param {Object} [opts]
 * @param {boolean} [opts.openOnly] - if true, filters to clinics with status === 'open'
 * @returns {Array} sorted clinics with distance_km attached
 */
function rankClinicsByDistance(clinics, lat, lng, opts = {}) {
  const { openOnly = false } = opts;
  return clinics
    .filter((c) => (openOnly ? c.status === 'open' : true))
    .map((c) => ({
      ...c,
      distance_km: Math.round(haversineDistanceKm(lat, lng, c.lat, c.lng) * 100) / 100,
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}

module.exports = { haversineDistanceKm, rankClinicsByDistance };
