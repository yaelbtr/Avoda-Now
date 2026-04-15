import { useRef } from "react";
import { MapView } from "@/components/Map";

type Job = {
  id: number;
  title: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  salary?: string | null;
  salaryType?: string;
  isUrgent?: boolean | null;
  distance?: number;
};

interface NearbyJobsMapProps {
  jobs: Job[];
  userLat: number;
  userLng: number;
}

export default function NearbyJobsMap({ jobs, userLat, userLng }: NearbyJobsMapProps) {
  const markersRef = useRef<google.maps.Marker[]>([]);

  const handleMapReady = (map: google.maps.Map) => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const userMarker = new google.maps.Marker({
      position: { lat: userLat, lng: userLng },
      map,
      title: "המיקום שלך",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 100,
    });
    markersRef.current.push(userMarker);

    jobs.forEach((job) => {
      if (!job.latitude || !job.longitude) return;

      const lat = typeof job.latitude === "string" ? parseFloat(job.latitude) : job.latitude;
      const lng = typeof job.longitude === "string" ? parseFloat(job.longitude) : job.longitude;
      if (isNaN(lat) || isNaN(lng)) return;

      const color = job.isUrgent ? "#ef4444" : "#2563eb";
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: job.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: job.isUrgent ? 50 : 10,
      });

      const distText = job.distance != null ? `📍 ${job.distance.toFixed(1)} ק"מ ממך` : "";
      const salaryText = job.salary ? `💰 ${job.salary}` : "";

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div dir="rtl" style="font-family: Heebo, sans-serif; min-width: 160px; padding: 4px;">
            ${job.isUrgent ? '<span style="background:#ef4444;color:white;font-size:10px;padding:2px 6px;border-radius:9999px;font-weight:bold;">⚡ דחוף</span><br/>' : ""}
            <strong style="font-size:13px;">${job.title}</strong>
            ${job.city ? `<br/><span style="color:#6b7280;font-size:11px;">📍 ${job.city}</span>` : ""}
            ${distText ? `<br/><span style="color:#6b7280;font-size:11px;">${distText}</span>` : ""}
            ${salaryText ? `<br/><span style="color:#16a34a;font-size:11px;">${salaryText}</span>` : ""}
            <br/>
            <a href="/jobs/${job.id}" style="color:#2563eb;font-size:11px;text-decoration:underline;">לפרטים ←</a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open({ anchor: marker, map });
      });

      markersRef.current.push(marker);
    });

    if (jobs.some((job) => job.latitude && job.longitude)) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: userLat, lng: userLng });

      jobs.forEach((job) => {
        if (!job.latitude || !job.longitude) return;

        const lat = typeof job.latitude === "string" ? parseFloat(job.latitude) : job.latitude;
        const lng = typeof job.longitude === "string" ? parseFloat(job.longitude) : job.longitude;
        if (isNaN(lat) || isNaN(lng)) return;

        bounds.extend({ lat, lng });
      });

      map.fitBounds(bounds, 40);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 340 }}>
      <MapView
        initialCenter={{ lat: userLat, lng: userLng }}
        initialZoom={13}
        onMapReady={handleMapReady}
        className="w-full h-full"
      />
    </div>
  );
}
