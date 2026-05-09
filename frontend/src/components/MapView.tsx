"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  price: number;
  title: string;
}

interface MapViewProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (id: string) => void;
  height?: string;
  draggable?: boolean;
  onDragEnd?: (lat: number, lng: number) => void;
}

let optionsSet = false;

export default function MapView({
  markers,
  center = { lat: 19.076, lng: 72.8777 },
  zoom = 12,
  onMarkerClick,
  height = "400px",
  draggable = false,
  onDragEnd,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState("");
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      setError("Google Maps API key not configured");
      return;
    }

    if (!optionsSet) {
      setOptions({ key, v: "weekly", libraries: ["places", "marker"] });
      optionsSet = true;
    }

    importLibrary("maps")
      .then(({ Map }) => {
        if (!mapRef.current) return;
        const map = new Map(mapRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
        setMapInstance(map);

        if (draggable) {
          const dragMarker = new google.maps.Marker({
            position: center,
            map,
            draggable: true,
            animation: google.maps.Animation.DROP,
          });
          dragMarker.addListener("dragend", () => {
            const pos = dragMarker.getPosition();
            if (pos && onDragEnd) {
              onDragEnd(pos.lat(), pos.lng());
            }
          });
        }
      })
      .catch((err) => {
        console.error("Map load error:", err);
        setError("Failed to load Google Maps");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add/update markers
  useEffect(() => {
    if (!mapInstance || draggable) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markers.forEach((m) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstance,
        label: {
          text: `₹${m.price.toLocaleString()}`,
          color: "white",
          fontSize: "11px",
          fontWeight: "700",
        },
        title: m.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
      });
      marker.addListener("click", () => onMarkerClick?.(m.id));
      markersRef.current.push(marker);
    });
  }, [mapInstance, markers, onMarkerClick, draggable]);

  if (error) {
    return (
      <div
        className="bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="rounded-2xl overflow-hidden" style={{ height, width: "100%" }} />;
}
