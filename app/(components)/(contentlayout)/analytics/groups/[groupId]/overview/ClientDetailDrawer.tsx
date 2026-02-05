"use client";

import React from "react";
import type { Client } from "./types";

export interface ClientDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

/**
 * Side drawer showing full client details: activities, tasks, timelines by activity.
 */
export function ClientDetailDrawer({ isOpen, onClose, client }: ClientDetailDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-label="Client details"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Client details</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!client ? (
            <p className="text-xs text-gray-500">No client selected.</p>
          ) : (
            <>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</h3>
                <p className="text-sm font-medium text-gray-900">{client.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="text-gray-900 truncate" title={client.email}>{client.email || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="text-gray-900">{client.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Category</span>
                  <p className="text-gray-900 font-medium">{client.category || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Turnover</span>
                  <p className="text-gray-900">{client.turnover ? `₹ ${client.turnover}` : "—"}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tasks & timelines</h3>
                <div className="flex gap-3 text-xs">
                  <span className="px-2 py-1 rounded bg-amber-50 text-amber-800">Tasks: {client.taskCount ?? 0}</span>
                  <span className="px-2 py-1 rounded bg-violet-50 text-violet-800">Timelines: {client.timelineCount ?? 0}</span>
                </div>
              </div>

              {client.activities && client.activities.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activities</h3>
                  <ul className="space-y-1.5">
                    {client.activities.map((a, i) => (
                      <li key={`${a.activity._id}-${i}`} className="text-xs flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                        <span className="font-medium text-gray-900">{a.activity.name}</span>
                        {a.notes && <span className="text-gray-500 truncate">({a.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {client.timelineByActivityCurrentFY && client.timelineByActivityCurrentFY.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Timelines by activity (current FY)</h3>
                  <div className="space-y-2">
                    {client.timelineByActivityCurrentFY.map((t) => (
                      <div
                        key={t.activityId}
                        className="text-xs p-2 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div className="font-medium text-gray-900 mb-1">{t.activityName}</div>
                        <div className="flex gap-3 text-gray-600">
                          <span>Done: {t.completedCurrentFY}</span>
                          <span>Pending: {t.pendingCurrentFY}</span>
                          <span>Total: {t.totalCurrentFY}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {client.turnoverHistory && client.turnoverHistory.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Turnover history</h3>
                  <ul className="space-y-1 text-xs">
                    {client.turnoverHistory.map((h) => (
                      <li key={h._id} className="flex justify-between">
                        <span className="text-gray-600">{h.year}</span>
                        <span className="font-medium text-gray-900">₹ {h.turnover}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
