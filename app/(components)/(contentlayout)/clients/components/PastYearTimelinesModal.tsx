"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";

/**
 * FY strings for completed Indian FYs only (strictly before current FY start).
 */
export function buildPastFinancialYearOptions(): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const currentFyStartYear = m >= 3 ? y : y - 1;
  const out: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const start = currentFyStartYear - i;
    out.push(`${start}-${start + 1}`);
  }
  return out;
}

export interface PastYearTimelinesModalActivity {
  id: string;
  name: string;
  subactivities?: Array<{
    _id: string;
    name: string;
    frequency?: string;
  }>;
}

export interface PastYearTimelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClientIds: string[];
  activities: PastYearTimelinesModalActivity[];
  isLoadingActivities: boolean;
  onSuccess?: () => void;
}

/**
 * Modal: backfill recurring timeline rows for a past financial year from existing client activity definitions.
 */
export function PastYearTimelinesModal({
  isOpen,
  onClose,
  selectedClientIds,
  activities,
  isLoadingActivities,
  onSuccess,
}: PastYearTimelinesModalProps) {
  const fyOptions = useMemo(() => buildPastFinancialYearOptions(), []);
  const [financialYear, setFinancialYear] = useState(fyOptions[0] ?? "");
  const [activityId, setActivityId] = useState("");
  const [subactivityId, setSubactivityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFinancialYear(fyOptions[0] ?? "");
    setActivityId("");
    setSubactivityId("");
  }, [isOpen, fyOptions]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    if (selectedClientIds.length === 0) {
      toast.error("Select at least one client");
      return;
    }
    if (!financialYear) {
      toast.error("Select a financial year");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, unknown> = {
        clientIds: selectedClientIds,
        financialYear,
      };
      if (activityId) body.activityId = activityId;
      if (subactivityId) body.subactivityId = subactivityId;

      const res = await fetch(`${Base_url}timelines/backfill-financial-year`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || res.statusText || "Backfill failed");
      }

      const created = typeof data.created === "number" ? data.created : 0;
      const skipped = typeof data.skipped === "number" ? data.skipped : 0;
      toast.success(`Created ${created} row(s), skipped ${skipped} duplicate(s).`);
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.error(`${data.errors.length} client(s) had errors (see network response).`, { duration: 5000 });
      }
      onSuccess?.();
      onClose();
      setActivityId("");
      setSubactivityId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedActivity = activities.find((a) => a.id === activityId);
  const subactivities = selectedActivity?.subactivities ?? [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="past-year-timelines-title"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h3 id="past-year-timelines-title" className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="ri-history-line text-xs" aria-hidden />
            Past FY timelines ({selectedClientIds.length} client
            {selectedClientIds.length === 1 ? "" : "s"})
          </h3>
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-[10px] overflow-auto flex-1 space-y-4">
          <div>
            <label htmlFor="past-fy-select" className="block text-[11px] font-medium text-[#495057] mb-2">
              Financial year (completed) <span className="text-red-500">*</span>
            </label>
            <select
              id="past-fy-select"
              className="bg-white border border-gray-400 text-[#323251] text-[11px] font-medium rounded px-3 py-1.5 pr-8 w-full focus:ring-0 focus:border-purple-500 appearance-none cursor-pointer"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              disabled={isSubmitting}
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="past-fy-activity" className="block text-[11px] font-medium text-[#495057] mb-2">
              Limit to activity (optional)
            </label>
            {isLoadingActivities ? (
              <div className="flex items-center py-2 text-[11px] text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2" />
                Loading activities…
              </div>
            ) : (
              <select
                id="past-fy-activity"
                className="bg-white border border-gray-400 text-[#323251] text-[11px] font-medium rounded px-3 py-1.5 pr-8 w-full focus:ring-0 focus:border-purple-500 appearance-none cursor-pointer"
                value={activityId}
                onChange={(e) => {
                  setActivityId(e.target.value);
                  setSubactivityId("");
                }}
                disabled={isSubmitting}
              >
                <option value="">All mapped activities</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {activityId && subactivities.length > 0 && (
            <div>
              <label htmlFor="past-fy-subactivity" className="block text-[11px] font-medium text-[#495057] mb-2">
                Limit to subactivity (optional)
              </label>
              <select
                id="past-fy-subactivity"
                className="bg-white border border-gray-400 text-[#323251] text-[11px] font-medium rounded px-3 py-1.5 pr-8 w-full focus:ring-0 focus:border-purple-500 appearance-none cursor-pointer"
                value={subactivityId}
                onChange={(e) => setSubactivityId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">All subactivities under this activity</option>
                {subactivities.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.frequency ? ` (${s.frequency})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded p-3 text-[12px] text-[#495057]">
            <p className="font-bold text-[#323251] mb-1">What this does</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Uses each client&apos;s existing activity mappings (same definitions as when timelines are created).
              </li>
              <li>Adds recurring rows for every due period that falls inside the chosen FY.</li>
              <li>Skips duplicates where that period already exists. One-time activities are not backfilled.</li>
              <li>Hourly schedules are skipped.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end p-[10px] border-t border-gray-200 gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50"
            onClick={() => onClose()}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !financialYear}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white inline-block" />
                Working…
              </>
            ) : (
              <>
                <i className="ri-check-line text-xs" aria-hidden />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
