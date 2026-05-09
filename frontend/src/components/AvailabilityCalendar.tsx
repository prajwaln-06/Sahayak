"use client";

import { useState, useMemo } from "react";

interface AvailabilityCalendarProps {
  blockedDates: string[];  // YYYY-MM-DD
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectRange: (start: string, end: string | null) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

export default function AvailabilityCalendar({
  blockedDates,
  selectedStart,
  selectedEnd,
  onSelectRange,
  onMonthChange,
}: AvailabilityCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navigate = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
    onMonthChange?.(y, m + 1);
  };

  const handleClick = (day: number) => {
    const key = toKey(viewYear, viewMonth, day);
    if (blockedSet.has(key)) return;
    const d = new Date(viewYear, viewMonth, day);
    if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      onSelectRange(key, null);
    } else {
      if (key < selectedStart) {
        onSelectRange(key, selectedStart);
      } else {
        onSelectRange(selectedStart, key);
      }
    }
  };

  const isInRange = (key: string) => {
    if (!selectedStart || !selectedEnd) return false;
    return key >= selectedStart && key <= selectedEnd;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-gray-900 text-sm">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const key = toKey(viewYear, viewMonth, day);
          const isBlocked = blockedSet.has(key);
          const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = key === selectedStart || key === selectedEnd;
          const inRange = isInRange(key);
          const isToday = key === toKey(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <button
              key={key}
              onClick={() => handleClick(day)}
              disabled={isBlocked || isPast}
              className={`
                relative h-9 rounded-lg text-xs font-medium transition-all duration-150
                ${isPast ? "text-gray-200 cursor-default" : ""}
                ${isBlocked ? "bg-red-50 text-red-300 cursor-not-allowed line-through" : ""}
                ${!isPast && !isBlocked && !isSelected && !inRange ? "text-gray-700 hover:bg-teal-50 hover:text-teal-700" : ""}
                ${isSelected ? "bg-teal-600 text-white shadow-sm" : ""}
                ${inRange && !isSelected ? "bg-teal-100 text-teal-800" : ""}
                ${isToday && !isSelected ? "ring-1 ring-teal-400" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-teal-600" /> Selected
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Blocked
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded ring-1 ring-teal-400" /> Today
        </div>
      </div>
    </div>
  );
}
