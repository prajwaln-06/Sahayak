"use client";

const AMENITIES: { key: string; label: string; icon: string }[] = [
  { key: "wifi", label: "WiFi", icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" },
  { key: "projector", label: "Projector", icon: "M3 3h18v12H3V3zm0 12l3 3h12l3-3M12 7v2" },
  { key: "whiteboard", label: "Whiteboard", icon: "M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4m-6 0l3 4m0-4l3 4" },
  { key: "ac", label: "AC", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { key: "parking", label: "Parking", icon: "M5 10v10a1 1 0 001 1h3V10m0 0V3h7a4 4 0 010 8H9V10z" },
  { key: "catering", label: "Catering", icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
  { key: "sound_system", label: "Sound System", icon: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" },
  { key: "lighting", label: "Studio Lighting", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { key: "kitchen", label: "Kitchen", icon: "M3 3h18v18H3V3zm3 6h12M6 13h4m2 0h4" },
  { key: "restrooms", label: "Restrooms", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { key: "elevator", label: "Elevator", icon: "M3 10h18M3 14h18m-9-4v8m-7-8V6a2 2 0 012-2h10a2 2 0 012 2v4" },
  { key: "wheelchair", label: "Wheelchair Access", icon: "M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" },
  { key: "security", label: "Security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { key: "cctv", label: "CCTV", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { key: "green_room", label: "Green Room", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { key: "stage", label: "Stage", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { key: "outdoor", label: "Outdoor Area", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { key: "power_backup", label: "Power Backup", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "changing_room", label: "Changing Room", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { key: "first_aid", label: "First Aid", icon: "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
];

interface AmenityGridProps {
  amenities: string[];
  selectable?: boolean;
  selected?: string[];
  onToggle?: (key: string) => void;
}

export default function AmenityGrid({
  amenities,
  selectable = false,
  selected = [],
  onToggle,
}: AmenityGridProps) {
  const displayAmenities = selectable ? AMENITIES : AMENITIES.filter((a) => amenities.includes(a.key));

  if (displayAmenities.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {displayAmenities.map((amenity) => {
        const isActive = selectable ? selected.includes(amenity.key) : true;
        return (
          <button
            key={amenity.key}
            type="button"
            onClick={() => selectable && onToggle?.(amenity.key)}
            disabled={!selectable}
            className={`
              flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all
              ${selectable ? "cursor-pointer" : "cursor-default"}
              ${isActive
                ? "bg-teal-50 text-teal-700 border border-teal-200"
                : "bg-gray-50 text-gray-400 border border-gray-100 hover:border-gray-200"
              }
            `}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={amenity.icon} />
            </svg>
            <span className="truncate">{amenity.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { AMENITIES };
