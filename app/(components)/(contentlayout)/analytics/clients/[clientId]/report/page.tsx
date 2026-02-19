"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from "@/app/api/config/BaseUrl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import type { ClientReportResponse, ReportTimelineItem } from "@/app/(components)/(contentlayout)/analytics/report/types";

/** FY options for dropdown */
function getFYOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear - 4; y <= currentYear + 1; y++) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

/** Group timelines by activity for "By activity" section */
function groupByActivity(items: ReportTimelineItem[] | undefined) {
  if (!items?.length) return [];
  const byId = new Map<string, { activityName: string; completed: ReportTimelineItem[]; pending: ReportTimelineItem[] }>();
  for (const t of items) {
    const aid = t.activity?._id ?? t.activity?.name ?? "unknown";
    const name = t.activity?.name ?? "—";
    if (!byId.has(aid)) byId.set(aid, { activityName: name, completed: [], pending: [] });
    const group = byId.get(aid)!;
    if (t.status === "completed") group.completed.push(t);
    else group.pending.push(t);
  }
  return Array.from(byId.entries()).map(([id, g]) => ({ activityId: id, ...g }));
}

const ClientReportPage = () => {
  const params = useParams();
  const clientId = params.clientId as string;
  const [data, setData] = useState<ClientReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** "current" = omit year (current FY), or e.g. "2024-2025" */
  const [year, setYear] = useState<string>("current");
  /** "all" | "pending" | "completed" — filters visible data and download */
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    if (!clientId) return;
    const query = year === "current" ? "" : `?year=${year}`;
    const url = `${Base_url}clients/${clientId}/report${query}`;
    setLoading(true);
    setError(null);
    fetch(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Failed to fetch report");
        return res.json();
      })
      .then((body) => {
        setData(body.data ?? body);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [clientId, year]);

  /** Timelines filtered by status (client-side); used for display and download */
  const filteredTimelines = useMemo(() => {
    const list = data?.timelines ?? [];
    if (statusFilter === "all") return list;
    return list.filter((t) => (t.status ?? "").toLowerCase() === statusFilter);
  }, [data?.timelines, statusFilter]);

  const byActivity = useMemo(() => groupByActivity(filteredTimelines), [filteredTimelines]);

  /** Status summary for filtered set (for display and download) */
  const filteredStatusSummary = useMemo(() => {
    const list = filteredTimelines;
    const pending = list.filter((t) => (t.status ?? "").toLowerCase() === "pending").length;
    const completed = list.filter((t) => (t.status ?? "").toLowerCase() === "completed").length;
    const delayed = list.filter((t) => (t.status ?? "").toLowerCase() === "delayed").length;
    const ongoing = list.filter((t) => (t.status ?? "").toLowerCase() === "ongoing").length;
    return { pending, completed, delayed, ongoing, total: list.length };
  }, [filteredTimelines]);

  const filterTimelinesByStatus = (list: ReportTimelineItem[] | undefined) =>
    !list ? [] : statusFilter === "all" ? list : list.filter((t) => (t.status ?? "").toLowerCase() === statusFilter);

  const auditingPrevFiltered = useMemo(() => filterTimelinesByStatus(data?.auditingPreviousYear?.timelines), [data?.auditingPreviousYear?.timelines, statusFilter]);
  const auditingNextFiltered = useMemo(() => filterTimelinesByStatus(data?.auditingNextYear?.timelines), [data?.auditingNextYear?.timelines, statusFilter]);

  if (loading && !data) {
    return (
      <div className="main-content">
        <Seo title="Client Report" />
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Loading report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="main-content">
        <Seo title="Client Report" />
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <i className="ri-error-warning-line text-2xl text-red-400" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <Link href={`/analytics/clients/${clientId}/overview`} className="ti-btn ti-btn-primary ti-btn-sm mt-2 inline-block">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="main-content">
        <Seo title="Client Report" />
        <p className="text-sm text-gray-500">No report data.</p>
      </div>
    );
  }

  const { client, financialYear, turnover, turnoverHistory, timelines, statusSummary, pendings, auditingPreviousYear, auditingNextYear } = data;
  const fyOptions = getFYOptions();
  const missing: string[] = [];
  if (!client || !client._id) missing.push("client");
  if (!financialYear) missing.push("financialYear");
  if (!statusSummary || typeof statusSummary.total !== "number") missing.push("statusSummary");
  if (!Array.isArray(timelines)) missing.push("timelines");
  if (!Array.isArray(pendings)) missing.push("pendings");
  if (!Array.isArray(turnoverHistory)) missing.push("turnoverHistory");

  const handleDownloadReport = () => {
    const clientSheet = [
      { Field: "Name", Value: client?.name ?? "—" },
      { Field: "Email", Value: client?.email ?? "—" },
      { Field: "Phone", Value: client?.phone ?? "—" },
      { Field: "Category", Value: client?.category ?? "—" },
      { Field: "Status", Value: client?.status ?? "—" },
      { Field: "Financial Year", Value: financialYear ?? "—" },
      { Field: "Turnover", Value: turnover ?? "—" },
      { Field: "Filter", Value: statusFilter === "all" ? "All" : statusFilter },
      { Field: "Pending", Value: filteredStatusSummary.pending },
      { Field: "Completed", Value: filteredStatusSummary.completed },
      { Field: "Delayed", Value: filteredStatusSummary.delayed },
      { Field: "Ongoing", Value: filteredStatusSummary.ongoing },
      { Field: "Total Timelines", Value: filteredStatusSummary.total },
    ];
    const activityRows: { Activity: string; Subactivity: string; Status: string; "Due Date": string; Frequency: string }[] = [];
    for (const t of filteredTimelines) {
      activityRows.push({
        Activity: t.activity?.name ?? "—",
        Subactivity: t.subactivity?.name ?? "—",
        Status: t.status ?? "—",
        "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
        Frequency: t.frequency ?? "—",
      });
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientSheet), "Client");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activityRows.length ? activityRows : [{ Activity: "—", Subactivity: "—", Status: "—", "Due Date": "—", Frequency: "—" }]), "By Activity & Subactivity");
    const filterByStatus = (list: ReportTimelineItem[]) =>
      statusFilter === "all" ? list : list.filter((t) => (t.status ?? "").toLowerCase() === statusFilter);
    const prevFiltered = filterByStatus(auditingPreviousYear?.timelines ?? []);
    if (prevFiltered.length > 0) {
      const prevRows = prevFiltered.map((t) => ({
        Activity: t.activity?.name ?? "—",
        Subactivity: t.subactivity?.name ?? "—",
        Status: t.status ?? "—",
        "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
        Frequency: t.frequency ?? "—",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prevRows), `Auditing Prev (${auditingPreviousYear!.financialYear})`);
    }
    const nextFiltered = filterByStatus(auditingNextYear?.timelines ?? []);
    if (nextFiltered.length > 0) {
      const nextRows = nextFiltered.map((t) => ({
        Activity: t.activity?.name ?? "—",
        Subactivity: t.subactivity?.name ?? "—",
        Status: t.status ?? "—",
        "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
        Frequency: t.frequency ?? "—",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nextRows), `Auditing Next (${auditingNextYear!.financialYear})`);
    }
    const safeName = (client?.name ?? "client").replace(/[/\\?*\[\]]/g, "_").slice(0, 30);
    const fileName = `client_report_${safeName}_${financialYear ?? "report"}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Report downloaded");
  };

  return (
    <div className="main-content">
      <Seo title={`Report - ${client.name}`} />
      <Toaster position="top-right" />
      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0">
            <nav className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Link href="/analytics/clients" className="text-blue-600 hover:underline">
                <i className="ri-arrow-left-line mr-1" /> Clients
              </Link>
              <span>/</span>
              <Link href={`/analytics/clients/${clientId}/overview`} className="text-blue-600 hover:underline truncate max-w-[180px] sm:max-w-none inline-block">
                {client.name}
              </Link>
              <span>/</span>
              <span className="font-medium text-gray-700">Report</span>
            </nav>
            <h1 className="box-title text-xl font-semibold text-gray-900">Year Report</h1>
            <p className="text-sm text-gray-500">Financial year: {financialYear}</p>
          </div>
          <div className="flex flex-nowrap items-center gap-3 shrink-0">
            <label className="text-xs text-gray-500">Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="form-select form-select-sm text-sm w-auto py-1.5 px-2 border border-gray-300 rounded-md"
            >
              <option value="current">Current FY</option>
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
            <label className="text-xs text-gray-500">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "completed")}
              className="form-select form-select-sm text-sm w-auto py-1.5 px-2 border border-gray-300 rounded-md"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <button type="button" onClick={handleDownloadReport} className="ti-btn ti-btn-primary whitespace-nowrap py-2 px-3 text-sm">
              <i className="ri-download-line me-1" /> Download report
            </button>
            <Link href={`/analytics/clients/${clientId}/overview`} className="ti-btn ti-btn-secondary whitespace-nowrap py-2 px-3 text-sm">
              <i className="ri-arrow-left-line me-1" /> Overview
            </Link>
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="box p-3 mb-4 border border-amber-200 bg-amber-50 rounded-lg">
          <p className="text-xs font-medium text-amber-800">
            <i className="ri-information-line mr-1" /> Missing in API response: {missing.join(", ")}
          </p>
        </div>
      )}

      {/* Client info */}
      <div className="box p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Client</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500">Name</span><p className="font-medium text-gray-900">{client?.name ?? "—"}</p></div>
          <div><span className="text-gray-500">Email</span><p className="text-gray-900">{client?.email ?? "—"}</p></div>
          <div><span className="text-gray-500">Phone</span><p className="text-gray-900">{client?.phone ?? "—"}</p></div>
          <div><span className="text-gray-500">Category</span><p className="text-gray-900">{client?.category ?? "—"}</p></div>
          <div><span className="text-gray-500">Status</span><p className="text-gray-900">{client?.status ?? "—"}</p></div>
        </div>
      </div>

      {/* Turnover */}
      <div className="box p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Turnover ({financialYear})</h2>
        <p className="text-2xl font-bold text-gray-900">{turnover ?? "—"}</p>
        {turnoverHistory?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">History</p>
            <ul className="space-y-1 text-sm">
              {turnoverHistory.map((h, i) => (
                <li key={h._id ?? i} className="flex justify-between">
                  <span className="text-gray-600">{h.year ?? "—"}</span>
                  <span className="font-medium text-gray-900">{h.turnover ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Status summary (filtered by selected status) */}
      <div className="box p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status summary {statusFilter !== "all" && `(${statusFilter})`}</h2>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">Pending: {filteredStatusSummary.pending}</span>
          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Completed: {filteredStatusSummary.completed}</span>
          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Delayed: {filteredStatusSummary.delayed}</span>
          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Ongoing: {filteredStatusSummary.ongoing}</span>
          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Total: {filteredStatusSummary.total}</span>
        </div>
      </div>

      {/* By activity: what we're working on, completed vs pending per activity/subactivity */}
      {byActivity.length > 0 && (
        <div className="box p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">By activity</h2>
          <p className="text-xs text-gray-500 mb-3">Activities for this client with completed and pending items (activity + subactivity).</p>
          <div className="space-y-4">
            {byActivity.map((group) => (
              <div key={group.activityId} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{group.activityName}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">Completed: {group.completed.length}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">Pending: {group.pending.length}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 font-medium text-gray-600">Subactivity</th>
                        <th className="text-left py-1.5 font-medium text-gray-600">Status</th>
                        <th className="text-left py-1.5 font-medium text-gray-600">Due date</th>
                        <th className="text-left py-1.5 font-medium text-gray-600">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.completed.map((t) => (
                        <tr key={t._id} className="border-b border-gray-100">
                          <td className="py-1.5 text-gray-900">{t.subactivity?.name ?? "—"}</td>
                          <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">{t.status}</span></td>
                          <td className="py-1.5 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                          <td className="py-1.5 text-gray-600">{t.frequency ?? "—"}</td>
                        </tr>
                      ))}
                      {group.pending.map((t) => (
                        <tr key={t._id} className="border-b border-gray-100">
                          <td className="py-1.5 text-gray-900">{t.subactivity?.name ?? "—"}</td>
                          <td className="py-1.5"><span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{t.status}</span></td>
                          <td className="py-1.5 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                          <td className="py-1.5 text-gray-600">{t.frequency ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auditing — Previous year (from API auditingPreviousYear), filtered by status */}
      {auditingPrevFiltered.length > 0 && (
        <div className="box p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Auditing — Previous year</h2>
          <p className="text-xs text-gray-500 mb-3">Financial year: {auditingPreviousYear!.financialYear ?? "—"}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-600">Activity</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Subactivity</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Status</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Due date</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {auditingPrevFiltered.map((t) => (
                  <tr key={t._id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-900">{t.activity?.name ?? "—"}</td>
                    <td className="py-1.5 text-gray-900">{t.subactivity?.name ?? "—"}</td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded ${t.status === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-1.5 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-1.5 text-gray-600">{t.frequency ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auditing — Next year (from API auditingNextYear), filtered by status */}
      {auditingNextFiltered.length > 0 && (
        <div className="box p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Auditing — Next year</h2>
          <p className="text-xs text-gray-500 mb-3">Financial year: {auditingNextYear!.financialYear ?? "—"}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-600">Activity</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Subactivity</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Status</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Due date</th>
                  <th className="text-left py-1.5 font-medium text-gray-600">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {auditingNextFiltered.map((t) => (
                  <tr key={t._id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-900">{t.activity?.name ?? "—"}</td>
                    <td className="py-1.5 text-gray-900">{t.subactivity?.name ?? "—"}</td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded ${t.status === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-1.5 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-1.5 text-gray-600">{t.frequency ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {byActivity.length === 0 && auditingPrevFiltered.length === 0 && auditingNextFiltered.length === 0 && (
        <div className="box p-4 text-center text-sm text-gray-500">
          No timelines for this year{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
        </div>
      )}
    </div>
  );
};

export default ClientReportPage;
