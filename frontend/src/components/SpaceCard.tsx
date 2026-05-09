"use client";

import Image from "next/image";
import Link from "next/link";

interface SpaceCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  priceHourly: number;
  ratingAvg: number;
  reviewCount: number;
  capacitySeated: number | null;
  capacityStanding: number | null;
  city: string;
  spaceType: string;
  instantBook: boolean;
}

const typeLabels: Record<string, string> = {
  CONFERENCE_ROOM: "Conference Room",
  STUDIO: "Studio",
  ROOFTOP: "Rooftop",
  GARDEN: "Garden",
  GALLERY: "Gallery",
  RESTAURANT: "Restaurant",
  WAREHOUSE: "Warehouse",
  OTHER: "Other",
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-gray-500 ml-0.5">({count})</span>
    </div>
  );
}

export default function SpaceCard({
  id,
  title,
  thumbnailUrl,
  priceHourly,
  ratingAvg,
  reviewCount,
  capacitySeated,
  capacityStanding,
  city,
  spaceType,
  instantBook,
}: SpaceCardProps) {
  const capacity = capacitySeated || capacityStanding || 0;

  return (
    <Link href={`/spaces/${id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/90 backdrop-blur text-gray-700">
              {typeLabels[spaceType] || spaceType}
            </span>
            {instantBook && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-500 text-white">
                Instant
              </span>
            )}
          </div>

          {/* Capacity badge */}
          {capacity > 0 && (
            <div className="absolute bottom-3 right-3 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#0D1B2A]/80 text-white backdrop-blur flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {capacity}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-teal-700 transition-colors">
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{city}</p>

          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="text-lg font-bold text-[#0D1B2A]">&#8377;{priceHourly.toLocaleString()}</span>
              <span className="text-xs text-gray-400 ml-0.5">/hr</span>
            </div>
            <StarRating rating={ratingAvg} count={reviewCount} />
          </div>
        </div>
      </div>
    </Link>
  );
}
