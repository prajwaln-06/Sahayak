"use client";

interface PriceBreakdownProps {
  hours: number;
  basePrice: number;
  weekendApplied: boolean;
  surgeApplied: boolean;
  platformFee: number;
  gst: number;
  total: number;
}

export default function PriceBreakdown({
  hours,
  basePrice,
  weekendApplied,
  surgeApplied,
  platformFee,
  gst,
  total,
}: PriceBreakdownProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Price Breakdown</h3>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Base ({hours}h)</span>
          <span className="font-medium text-gray-900">&#8377;{basePrice.toLocaleString()}</span>
        </div>

        {weekendApplied && (
          <div className="flex justify-between">
            <span className="text-gray-600 flex items-center gap-1">
              Weekend surcharge
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">1.3x</span>
            </span>
            <span className="text-amber-600 font-medium">Included</span>
          </div>
        )}

        {surgeApplied && (
          <div className="flex justify-between">
            <span className="text-gray-600 flex items-center gap-1">
              High demand
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">Surge</span>
            </span>
            <span className="text-red-600 font-medium">Included</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Platform fee (12%)</span>
          <span className="font-medium text-gray-900">&#8377;{platformFee.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">GST (18%)</span>
          <span className="font-medium text-gray-900">&#8377;{gst.toLocaleString()}</span>
        </div>

        <div className="border-t border-gray-100 pt-2.5 mt-2.5">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-lg text-[#0D1B2A]">&#8377;{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
