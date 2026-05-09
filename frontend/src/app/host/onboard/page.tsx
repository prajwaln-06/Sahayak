"use client";

import { useState, useCallback, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import AmenityGrid from "@/components/AmenityGrid";
import MapView from "@/components/MapView";
import api from "@/lib/api";

// ── Types ────────────────────────────────────────────────────
interface SpaceFormData {
  space_type: string;
  title: string;
  description: string;
  address: string;
  city: string;
  neighbourhood: string;
  lat: number;
  lng: number;
  capacity_seated: number;
  capacity_standing: number;
  amenities: string[];
  base_price_hourly: number;
  base_price_daily: number;
  weekend_multiplier: number;
  surge_enabled: boolean;
  surge_multiplier: number;
  min_booking_hours: number;
  instant_book: boolean;
}

const INITIAL: SpaceFormData = {
  space_type: "", title: "", description: "", address: "", city: "", neighbourhood: "",
  lat: 19.076, lng: 72.8777, capacity_seated: 20, capacity_standing: 50, amenities: [],
  base_price_hourly: 1000, base_price_daily: 8000, weekend_multiplier: 1.3,
  surge_enabled: false, surge_multiplier: 1.5, min_booking_hours: 1, instant_book: false,
};

const SPACE_TYPES = [
  { value: "CONFERENCE_ROOM", label: "Conference Room", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { value: "STUDIO", label: "Studio", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { value: "ROOFTOP", label: "Rooftop", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { value: "GARDEN", label: "Garden", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  { value: "GALLERY", label: "Gallery", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { value: "RESTAURANT", label: "Restaurant", icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
  { value: "WAREHOUSE", label: "Warehouse", icon: "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" },
  { value: "OTHER", label: "Other", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
];

const STEPS = ["Space Type", "Location", "Photos", "Pricing"];

// ── Main Component ───────────────────────────────────────────
export default function HostOnboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SpaceFormData>(INITIAL);
  const [createdSpaceId, setCreatedSpaceId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [bulletPoints, setBulletPoints] = useState("");

  // Pricing wizard state
  const [pricingStep, setPricingStep] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const update = (key: keyof SpaceFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  // ── Step 1: Space Type ─────────────────────────────────────
  const renderSpaceType = () => (
    <div>
      <h2 className="text-xl font-bold text-[#0D1B2A] mb-2">What type of space?</h2>
      <p className="text-sm text-gray-500 mb-6">Choose the category that best describes your space</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SPACE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update("space_type", t.value)}
            className={`
              flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200
              ${form.space_type === t.value
                ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
              }
            `}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            <span className="text-xs font-semibold">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2: Location ───────────────────────────────────────
  const renderLocation = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0D1B2A] mb-2">Where is your space?</h2>
        <p className="text-sm text-gray-500 mb-4">Drop a pin on the map and fill in the address</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <input placeholder="Space title *" value={form.title} onChange={(e) => update("title", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors" />
          <input placeholder="Full address *" value={form.address} onChange={(e) => update("address", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City *" value={form.city} onChange={(e) => update("city", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors" />
            <input placeholder="Neighbourhood" value={form.neighbourhood} onChange={(e) => update("neighbourhood", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Seated capacity</label>
              <input type="number" value={form.capacity_seated} onChange={(e) => update("capacity_seated", +e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Standing capacity</label>
              <input type="number" value={form.capacity_standing} onChange={(e) => update("capacity_standing", +e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors" />
            </div>
          </div>
        </div>
        <div>
          <MapView
            markers={[]}
            center={{ lat: form.lat, lng: form.lng }}
            zoom={14}
            height="320px"
            draggable
            onDragEnd={(lat, lng) => { update("lat", lat); update("lng", lng); }}
          />
          <p className="text-[10px] text-gray-400 mt-2 text-center">Drag the pin to your exact location</p>
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Amenities</h3>
        <AmenityGrid
          amenities={[]}
          selectable
          selected={form.amenities}
          onToggle={(key) => {
            const current = form.amenities;
            update("amenities", current.includes(key) ? current.filter((a) => a !== key) : [...current, key]);
          }}
        />
      </div>

      {/* AI Description */}
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-2">Description</h3>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <textarea
            placeholder="Enter bullet points about your space (one per line) and let AI write the description..."
            value={bulletPoints}
            onChange={(e) => setBulletPoints(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors bg-white resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!bulletPoints.trim() || aiLoading}
              onClick={async () => {
                setAiLoading(true);
                try {
                  const res = await api.post("/listings/ai/generate-description", {
                    bullet_points: bulletPoints.split("\n").filter(Boolean),
                    space_type: form.space_type,
                  });
                  update("description", res.data.description);
                } catch { setError("AI generation failed."); }
                setAiLoading(false);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {aiLoading ? <LoadingSpinner size="sm" className="border-teal-300 border-t-white" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              Generate with AI
            </button>
          </div>
          {form.description && (
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors bg-white resize-none"
            />
          )}
        </div>
      </div>
    </div>
  );

  // ── Step 3: Photos ─────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10 - photos.length);
    setPhotos((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const handleVideoAdd = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be under 100MB");
      return;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

  const renderPhotos = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#0D1B2A] mb-2">Add photos</h2>
        <p className="text-sm text-gray-500 mb-6">Upload up to 10 photos of your space (required)</p>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handlePhotoAdd(e.dataTransfer.files); }}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all"
        >
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">Drag & drop photos here or <span className="text-teal-600 font-medium">browse</span></p>
          <p className="text-xs text-gray-400 mt-1">{photos.length}/10 photos</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handlePhotoAdd(e.target.files)} className="hidden" />
        </div>

        {/* Preview grid */}
        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
            {photoPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {i === 0 && <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 text-[9px] font-bold rounded-full bg-teal-500 text-white">Cover</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <h2 className="text-xl font-bold text-[#0D1B2A] mb-2">Video Tour (optional)</h2>
        <p className="text-sm text-gray-500 mb-6">Upload a walkthrough video — MP4 or MOV, max 100MB</p>

        {videoPreview ? (
          <div className="relative rounded-2xl overflow-hidden bg-black max-w-md w-full aspect-video">
            <video src={videoPreview} controls className="w-full h-full" />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="block max-w-md border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Drag & drop video or <span className="text-teal-600 font-medium">browse</span></p>
            <input
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(e) => handleVideoAdd(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );

  // ── Step 4: Pricing Wizard (chatbot-style) ─────────────────
  const pricingQuestions = [
    { key: "base_price_hourly", q: "What's your hourly rate? (₹)", type: "number" },
    { key: "base_price_daily", q: "And the full-day rate? (₹)", type: "number" },
    { key: "weekend_multiplier", q: "Weekend rate multiplier?", type: "number", hint: "E.g. 1.3 means 30% extra on weekends" },
    { key: "surge_enabled", q: "Enable surge pricing for high demand?", type: "toggle" },
    { key: "min_booking_hours", q: "Minimum booking duration (hours)?", type: "number" },
    { key: "instant_book", q: "Allow instant booking without approval?", type: "toggle" },
  ];

  const renderPricing = () => (
    <div>
      <h2 className="text-xl font-bold text-[#0D1B2A] mb-2">Set your pricing</h2>
      <p className="text-sm text-gray-500 mb-6">Answer each question to configure your rates</p>

      <div className="space-y-4 max-w-md">
        {pricingQuestions.map((pq, i) => {
          if (i > pricingStep) return null;
          const val = form[pq.key as keyof SpaceFormData];

          return (
            <div key={pq.key} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Bot bubble */}
              <div className="flex gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700 max-w-xs">
                  {pq.q}
                  {pq.hint && <p className="text-[10px] text-gray-400 mt-0.5">{pq.hint}</p>}
                </div>
              </div>

              {/* User response */}
              <div className="flex justify-end">
                {pq.type === "toggle" ? (
                  <div className="flex gap-2">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => { update(pq.key as keyof SpaceFormData, v); if (i === pricingStep) setPricingStep((s) => s + 1); }}
                        className={`px-5 py-2 rounded-2xl rounded-br-sm text-sm font-medium transition-all ${
                          val === v ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {v ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={val as number}
                      onChange={(e) => update(pq.key as keyof SpaceFormData, +e.target.value)}
                      className="w-28 px-3 py-2 rounded-2xl rounded-br-sm border-2 border-gray-200 text-sm text-right font-medium outline-none focus:border-teal-500"
                    />
                    {i === pricingStep && (
                      <button
                        type="button"
                        onClick={() => setPricingStep((s) => s + 1)}
                        className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm hover:bg-teal-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Submit ─────────────────────────────────────────────────
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      // 1. Create the listing
      let spaceId = createdSpaceId;
      if (!spaceId) {
        const res = await api.post("/listings/", form);
        spaceId = res.data.id;
        setCreatedSpaceId(spaceId);
      }

      // 2. Upload photos and video
      if ((photos.length > 0 || videoFile) && spaceId) {
        const fd = new FormData();
        photos.forEach((f) => fd.append("files", f));
        if (videoFile) fd.append("files", videoFile);

        const token = localStorage.getItem("flexispace_token");
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/listings/${spaceId}/photos`);
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded * 100) / e.total));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              let msg = "Upload failed";
              try { msg = JSON.parse(xhr.responseText).detail || msg; } catch {}
              reject(new Error(msg));
            }
          };

          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(fd);
        });
      }

      router.push(`/spaces/${spaceId}`);
    } catch (err: any) {
      setError(err.message || err.response?.data?.detail || "Failed to create listing.");
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  // ── Navigation ─────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return !!form.space_type;
    if (step === 1) return form.title && form.address && form.city;
    if (step === 2) return true;
    if (step === 3) return form.base_price_hourly > 0;
    return false;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] py-4 px-6 flex items-center justify-between">
        <span className="text-white font-bold text-lg">FlexiSpace</span>
        <span className="text-white/60 text-sm">List your space</span>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= step ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-400"
                }`}>{i + 1}</div>
                <span className={`text-xs font-medium hidden sm:block ${i <= step ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? "bg-teal-500" : "bg-gray-100"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
        )}

        {step === 0 && renderSpaceType()}
        {step === 1 && renderLocation()}
        {step === 2 && renderPhotos()}
        {step === 3 && renderPricing()}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { setStep((s) => s - 1); setError(""); }}
            disabled={step === 0}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-0"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-all"
            >
              Continue
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canNext()}
                className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#0D1B2A] text-white hover:bg-[#1B2D45] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmitting ? <><LoadingSpinner size="sm" className="border-gray-400 border-t-white" /> Publishing...</> : "Publish Listing"}
              </button>
              {isSubmitting && uploadProgress > 0 && (
                <div className="w-full max-w-xs flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">{uploadProgress}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
