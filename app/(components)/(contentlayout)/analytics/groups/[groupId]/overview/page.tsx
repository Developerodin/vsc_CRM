"use client";

import React, { useState, useEffect, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from "@/app/api/config/BaseUrl";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { GroupAnalyticsResponse, Client } from "./types";
import { ClientDetailDrawer } from "./ClientDetailDrawer";

/** Build FY options for dropdown (e.g. 2021-2022 .. 2027-2028) */
function getFYOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear - 4; y <= currentYear + 2; y++) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

const FY_OPTIONS = getFYOptions();

const GroupOverviewPage = () => {
  const params = useParams();
  const groupId = params.groupId as string;

  const [groupData, setGroupData] = useState<GroupAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  /** Selected fiscal year: "all" (default) or e.g. "2025-2026". */
  const [selectedFY, setSelectedFY] = useState<string>("all");

  useEffect(() => {
    if (groupId) fetchGroupOverview(undefined);
  }, [groupId]);

  const fetchGroupOverview = async (fy?: string) => {
    try {
      setLoading(true);
      setError(null);
      const sendFy = fy && fy !== "all" ? fy : undefined;
      const queryParams = sendFy ? { fy: sendFy } : {};
      const response = await axios.get(`${Base_url}groups/${groupId}/analytics`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: queryParams,
      });
      const data = response.data as GroupAnalyticsResponse;
      setGroupData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch group analytics");
    } finally {
      setLoading(false);
    }
  };

  const onYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedFY(val);
    fetchGroupOverview(val === "all" ? undefined : val);
  };

  const categories = useMemo(() => {
    if (!groupData?.clients) return [];
    const set = new Set<string>();
    groupData.clients.forEach((c) => c.category && set.add(c.category));
    return Array.from(set).sort();
  }, [groupData?.clients]);

  const filteredClients = useMemo(() => {
    if (!groupData?.clients) return [];
    if (categoryFilter === "all") return groupData.clients;
    return groupData.clients.filter((c) => c.category === categoryFilter);
  }, [groupData?.clients, categoryFilter]);

  const openClientDrawer = (client: Client) => {
    setDrawerClient(client);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Group Analytics" />
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin" />
            <p className="text-xs text-gray-500 mt-2">Loading group analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Seo title="Group Analytics" />
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <i className="ri-error-warning-line text-2xl text-red-400" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <button type="button" onClick={fetchGroupOverview} className="ti-btn ti-btn-primary ti-btn-sm mt-2">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="main-content">
        <Seo title="Group Analytics" />
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-500">No group data available.</p>
        </div>
      </div>
    );
  }

  const task = groupData.taskAnalytics;
  const timeline = groupData.timelineAnalytics;
  const turnoverSummary = groupData.groupTurnoverSummary;
  const activityWise = groupData.activityWiseTimelineAnalytics;

  return (
    <div className="main-content">
      <Seo title={`Group Analytics - ${groupData.group.name}`} />

      {/* Compact header: group name + year selector */}
      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">{groupData.group.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Year:</span>
              <select
                value={selectedFY}
                onChange={onYearChange}
                className="form-select form-select-sm text-xs w-auto py-1.5 px-2 border border-gray-300 rounded-md"
                aria-label="Select fiscal year"
              >
                <option value="all">All</option>
                {FY_OPTIONS.map((fy) => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 w-full flex-none basis-full">
              <span className="mr-3"><i className="ri-building-line mr-1" />{groupData.group.branch?.name ?? "N/A"}</span>
              <span><i className="ri-user-line mr-1" />{groupData.group.numberOfClients} clients</span>
              <span className="ml-3">{selectedFY === "all" ? "All" : selectedFY}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-nowrap shrink-0">
            <Link href={`/analytics/groups/${groupId}/report`} className="ti-btn ti-btn-primary whitespace-nowrap py-2 px-3 text-sm">
              <i className="ri-file-list-3-line me-1" /> Report
            </Link>
            <Link href="/analytics/groups" className="ti-btn ti-btn-secondary whitespace-nowrap py-2 px-3 text-sm">
              <i className="ri-arrow-left-line me-1" /> Back
            </Link>
          </div>
        </div>
      </div>

      {/* Small stat cards — no graphs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        <div className="box p-3 border border-gray-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Tasks</p>
          <p className="text-lg font-bold text-gray-900">{task?.total ?? 0}</p>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Completed tasks</p>
          <p className="text-lg font-bold text-success">{task?.statusBreakdown?.completed ?? 0}</p>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Timelines</p>
          <p className="text-lg font-bold text-gray-900">{timeline?.total ?? 0}</p>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Completed timelines</p>
          <p className="text-lg font-bold text-success">{timeline?.statusBreakdown?.completed ?? 0}</p>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Clients w/ turnover</p>
          <p className="text-lg font-bold text-gray-900">{turnoverSummary?.clientsWithTurnover ?? 0}</p>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Selected year</p>
          <p className="text-sm font-semibold text-gray-900">{selectedFY === "all" ? "All" : selectedFY || "—"}</p>
        </div>
      </div>

      {/* Task status & priority — compact row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="box p-3 border border-gray-200 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Task status</h3>
          <div className="flex flex-wrap gap-1.5">
            {["pending", "ongoing", "completed", "on_hold", "delayed", "cancelled"].map((key) => (
              <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {key.replace("_", " ")}: {(task?.statusBreakdown as Record<string, number>)?.[key] ?? 0}
              </span>
            ))}
          </div>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Task priority</h3>
          <div className="flex flex-wrap gap-1.5">
            {["low", "medium", "high", "urgent", "critical"].map((key) => (
              <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {key}: {(task?.priorityBreakdown as Record<string, number>)?.[key] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline status & frequency — compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="box p-3 border border-gray-200 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Timeline status</h3>
          <div className="flex flex-wrap gap-1.5">
            {["pending", "ongoing", "completed", "delayed"].map((key) => (
              <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {key}: {(timeline?.statusBreakdown as Record<string, number>)?.[key] ?? 0}
              </span>
            ))}
          </div>
        </div>
        <div className="box p-3 border border-gray-200 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Timeline frequency</h3>
          <div className="flex flex-wrap gap-1.5">
            {["Yearly", "Quarterly", "Monthly", "Weekly", "Daily", "Hourly", "OneTime", "None"].map((key) => (
              <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {key}: {(timeline?.frequencyBreakdown as Record<string, number>)?.[key] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Activity-wise timeline (current FY) */}
      {activityWise?.byActivity?.length > 0 && (
        <div className="box p-3 border border-gray-200 rounded-lg mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Timelines by activity — {selectedFY === "all" ? "All" : selectedFY || activityWise.currentFY}</h3>
          <div className="flex flex-wrap gap-2">
            {activityWise.byActivity.map((a) => (
              <div key={a.activityId} className="text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="font-medium text-gray-900">{a.activityName}</span>
                <span className="text-gray-500 ml-2">Done: {a.completedCurrentFY} · Pending: {a.pendingCurrentFY} · Total: {a.totalCurrentFY}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turnover summary */}
      {turnoverSummary?.turnoverByClient?.length > 0 && (
        <div className="box p-3 border border-gray-200 rounded-lg mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Turnover by client</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-600">Client</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Category</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Year</th>
                  <th className="text-right py-1.5 font-medium text-gray-600">Turnover</th>
                </tr>
              </thead>
              <tbody>
                {turnoverSummary.turnoverByClient.map((row) => (
                  <tr key={row.clientId} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-900">{row.clientName}</td>
                    <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">{row.category}</span></td>
                    <td className="py-1.5 text-gray-600">{row.year ?? "—"}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900">{row.turnover ? `₹ ${row.turnover}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clients by category + table */}
      <div className="box p-3 border border-gray-200 rounded-lg mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-semibold text-gray-700">Clients in group</h3>
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-select form-select-sm text-xs w-auto py-1"
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-600">Name</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Contact</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Category</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Turnover</th>
                  <th className="text-center py-1.5 font-medium text-gray-600">Tasks</th>
                  <th className="text-center py-1.5 font-medium text-gray-600">Timelines</th>
                  <th className="text-right py-1.5 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900 max-w-[140px] truncate" title={client.name}>{client.name}</td>
                    <td className="py-2">
                      <div className="max-w-[120px] truncate text-gray-600" title={client.email}>{client.email || "—"}</div>
                      <div className="text-[10px] text-gray-500">{client.phone || "—"}</div>
                    </td>
                    <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">{client.category || "—"}</span></td>
                    <td className="py-2 font-medium">{client.turnover ? `₹ ${client.turnover}` : "—"}</td>
                    <td className="py-2 text-center">{client.taskCount ?? 0}</td>
                    <td className="py-2 text-center">{client.timelineCount ?? 0}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openClientDrawer(client)}
                        className="text-primary hover:underline text-[10px] font-medium"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-4 text-center">No clients{categoryFilter !== "all" ? " in this category" : ""}.</p>
        )}
      </div>

      <ClientDetailDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerClient(null); }}
        client={drawerClient}
      />
    </div>
  );
};

export default GroupOverviewPage;
