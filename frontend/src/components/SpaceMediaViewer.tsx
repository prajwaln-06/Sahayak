"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface SpaceMediaViewerProps {
  photos: string[];
  videoUrl: string | null;
  title: string;
}

export default function SpaceMediaViewer({ photos, videoUrl, title }: SpaceMediaViewerProps) {
  const [activeTab, setActiveTab] = useState<"photos" | "video">("photos");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Auto-advance photos
  useEffect(() => {
    if (activeTab !== "photos" || photos.length <= 1 || isLightboxOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, photos.length, isLightboxOpen]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handleNext, handlePrev]);

  return (
    <div className="w-full bg-black rounded-b-none lg:rounded-2xl lg:overflow-hidden relative shadow-lg group">
      {/* Tabs */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur transition-all ${
            activeTab === "photos" ? "bg-white text-black shadow-md" : "bg-black/50 text-white hover:bg-black/70"
          }`}
        >
          📷 Photos
        </button>
        <button
          onClick={() => setActiveTab("video")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur transition-all ${
            activeTab === "video" ? "bg-white text-black shadow-md" : "bg-black/50 text-white hover:bg-black/70"
          }`}
        >
          🎬 Video Tour
        </button>
      </div>

      {activeTab === "photos" && (
        <div className="relative w-full h-full flex flex-col">
          {/* Main Display */}
          <div 
            className="relative w-full aspect-video cursor-pointer bg-gray-900"
            onClick={() => photos.length > 0 && setIsLightboxOpen(true)}
          >
            {photos.length > 0 ? (
              <>
                {photos.map((src, i) => (
                  <div
                    key={src}
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      i === currentIndex ? "opacity-100 z-0" : "opacity-0 -z-10"
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`${title} - Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      priority={i === 0}
                    />
                  </div>
                ))}

                {/* Counter */}
                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-white text-xs font-medium">
                  {currentIndex + 1} / {photos.length}
                </div>

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </>
                )}

                {/* Dots */}
                {photos.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentIndex ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 border border-gray-800">
                <svg className="w-12 h-12 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 text-sm">No photos available</p>
              </div>
            )}
          </div>

          {/* Thumbnails Strip */}
          {photos.length > 1 && (
            <div className="bg-black p-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
              {photos.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setCurrentIndex(i)}
                  className={`relative flex-shrink-0 w-20 aspect-video rounded-md overflow-hidden transition-all ${
                    i === currentIndex ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image src={src} alt={`Thumb ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "video" && (
        <div className="w-full aspect-video bg-gray-900 flex flex-col items-center justify-center relative">
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                controls
                preload="metadata"
                poster={photos.length > 0 ? photos[0] : undefined}
                className="w-full h-full object-cover lg:rounded-2xl"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1.5 z-10">
                <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <span className="text-[10px] text-white font-medium uppercase tracking-wider">Host-uploaded walkthrough video</span>
              </div>
            </>
          ) : (
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="text-white font-medium">No video tour yet</h3>
              <p className="text-gray-400 text-sm mt-1">The host hasn't uploaded a walkthrough video</p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="absolute top-6 left-6 text-white font-medium z-50 tracking-wide text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {photos.length}
          </div>

          <div className="relative w-full max-w-6xl max-h-[80vh] flex-1">
            <Image
              src={photos[currentIndex]}
              alt={`${title} - Lightbox`}
              fill
              className="object-contain"
              priority
            />
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
               >
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
               </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
