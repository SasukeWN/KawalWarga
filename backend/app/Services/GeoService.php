<?php

namespace App\Services;

class GeoService
{
    private const EARTH_RADIUS_M = 6371000.0;

    /**
     * Hitung jarak permukaan bumi antara dua titik koordinat dalam satuan meter (Haversine).
     */
    public static function haversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));

        return (int) round(self::EARTH_RADIUS_M * $c);
    }

    /**
     * Hitung batas koordinat kasar (bounding box) untuk penyaringan cepat di SQL.
     *
     * @return array{min_lat: float, max_lat: float, min_lon: float, max_lon: float}
     */
    public static function boundingBox(float $lat, float $lon, float $radiusMeters): array
    {
        $latDelta = rad2deg($radiusMeters / self::EARTH_RADIUS_M);
        $cosLat   = cos(deg2rad($lat));
        $lonDelta = abs($cosLat) > 0.0001
            ? rad2deg($radiusMeters / (self::EARTH_RADIUS_M * $cosLat))
            : 180.0;

        return [
            'min_lat' => $lat - $latDelta,
            'max_lat' => $lat + $latDelta,
            'min_lon' => $lon - $lonDelta,
            'max_lon' => $lon + $lonDelta,
        ];
    }
}
