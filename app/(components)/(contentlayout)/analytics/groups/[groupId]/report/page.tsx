"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import Seo from "@/shared/layout-components/seo/seo";
import { Base_url } from "@/app/api/config/BaseUrl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import type { GroupReportResponse, ReportTimelineItem } from "@/app/(components)/(contentlayout)/analytics/report/types";

function getFYOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear - 4; y <= currentYear + 1; y++) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

const GroupReportPage = () => {
  const params = useParams();
  const groupId = params.groupId as string;
  const [data, setData] = useState<GroupReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>("current");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    if (!groupId) return;
    const query = year === "current" ? "" : `?year=${year}`;
    const url = `${Base_url}groups/${groupId}/report${query}`;
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
  }, [groupId, year]);

  const filteredClients = useMemo(() => {
    if (!data?.clients) return [];
    const filterList = (list: ReportTimelineItem[] | undefined) =>
      !list ? [] : statusFilter === "all" ? list : list.filter((t) => (t.status ?? "").toLowerCase() === statusFilter);
    return data.clients.map((block) => {
      const timelines = filterList(block.timelines);
      const pending = timelines.filter((t) => (t.status ?? "").toLowerCase() === "pending").length;
      const completed = timelines.filter((t) => (t.status ?? "").toLowerCase() === "completed").length;
      const delayed = timelines.filter((t) => (t.status ?? "").toLowerCase() === "delayed").length;
      const ongoing = timelines.filter((t) => (t.status ?? "").toLowerCase() === "ongoing").length;
      const pendings = filterList(block.pendings);
      return {
        ...block,
        timelines,
        pendings,
        statusSummary: { pending, completed, delayed, ongoing, total: timelines.length },
      };
    });
  }, [data?.clients, statusFilter]);

  const filteredSummary = useMemo(() => {
    let totalTimelines = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    for (const block of filteredClients) {
      totalTimelines += block.statusSummary.total;
      totalPending += block.statusSummary.pending;
      totalCompleted += block.statusSummary.completed;
    }
    return {
      totalClients: filteredClients.length,
      totalTimelines,
      totalPending,
      totalCompleted,
    };
  }, [filteredClients]);

  if (loading && !data) {
    return (
      <div className="main-content">
        <Seo title="Group Report" />
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
        <Seo title="Group Report" />
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <i className="ri-error-warning-line text-2xl text-red-400" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <Link href={`/analytics/groups/${groupId}/overview`} className="ti-btn ti-btn-primary ti-btn-sm mt-2 inline-block">
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
        <Seo title="Group Report" />
        <p className="text-sm text-gray-500">No report data.</p>
      </div>
    );
  }

  const { group, financialYear, clients, summary } = data;
  const fyOptions = getFYOptions();
  const branchName = typeof group.branch === "object" ? group.branch?.name : group.branch ?? "—";

  const handleDownloadReport = () => {
    const groupSheet = [
      { Field: "Group Name", Value: group.name },
      { Field: "Financial Year", Value: financialYear ?? "—" },
      { Field: "Branch", Value: branchName },
      { Field: "Filter", Value: statusFilter === "all" ? "All" : statusFilter },
      { Field: "Total Clients", Value: filteredSummary.totalClients },
      { Field: "Total Timelines", Value: filteredSummary.totalTimelines },
      { Field: "Total Pending", Value: filteredSummary.totalPending },
      { Field: "Total Completed", Value: filteredSummary.totalCompleted },
    ];
    const activityRows: {
      "Client Name": string;
      Email: string;
      Category: string;
      Turnover: string;
      Activity: string;
      Subactivity: string;
      Status: string;
      "Due Date": string;
      "Completed AT": string;
      Frequency: string;
    }[] = [];
    for (const block of filteredClients) {
      const clientName = block.client?.name ?? "—";
      const email = block.client?.email ?? "—";
      const category = block.client?.category ?? "—";
      const turnover = block.turnover ?? "—";
      for (const t of block.timelines) {
        activityRows.push({
          "Client Name": clientName,
          Email: email,
          Category: category,
          Turnover: turnover,
          Activity: t.activity?.name ?? "—",
          Subactivity: t.subactivity?.name ?? "—",
          Status: t.status ?? "—",
          "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
          "Completed AT": t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—",
          Frequency: t.frequency ?? "—",
        });
      }
    }
    const wsGroup = XLSX.utils.json_to_sheet(groupSheet);
    const wsActivity = XLSX.utils.json_to_sheet(
      activityRows.length ? activityRows : [{ "Client Name": "—", Email: "—", Category: "—", Turnover: "—", Activity: "—", Subactivity: "—", Status: "—", "Due Date": "—", "Completed AT": "—", Frequency: "—" }]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsGroup, "Group");
    XLSX.utils.book_append_sheet(wb, wsActivity, "Clients by Activity");
    const safeName = (group.name ?? "group").replace(/[/\\?*\[\]]/g, "_").slice(0, 30);
    const fileName = `group_report_${safeName}_${financialYear ?? "report"}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Report downloaded");
  };

  return (
    <div className="main-content">
      <Seo title={`Report - ${group.name}`} />
      <Toaster position="top-right" />
      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0">
            <nav className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Link href="/analytics/groups" className="text-blue-600 hover:underline">
                <i className="ri-arrow-left-line mr-1" /> Groups
              </Link>
              <span>/</span>
              <Link href={`/analytics/groups/${groupId}/overview`} className="text-blue-600 hover:underline truncate max-w-[180px] sm:max-w-none inline-block">
                {group.name}
              </Link>
              <span>/</span>
              <span className="font-medium text-gray-700">Report</span>
            </nav>
            <h1 className="box-title text-xl font-semibold text-gray-900">Year Report</h1>
            <p className="text-sm text-gray-500">Financial year: {financialYear} · Branch: {branchName}</p>
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
            <Link href={`/analytics/groups/${groupId}/overview`} className="ti-btn ti-btn-secondary whitespace-nowrap py-2 px-3 text-sm">
              <i className="ri-arrow-left-line me-1" /> Overview
            </Link>
          </div>
        </div>
      </div>

      {/* Summary (filtered by status) */}
      <div className="box p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Summary {statusFilter !== "all" && `(${statusFilter})`}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <div><span className="text-gray-500">Total clients</span><p className="text-lg font-bold text-gray-900">{filteredSummary.totalClients}</p></div>
          <div><span className="text-gray-500">Total timelines</span><p className="text-lg font-bold text-gray-900">{filteredSummary.totalTimelines}</p></div>
          <div><span className="text-gray-500">Total pending</span><p className="text-lg font-bold text-amber-600">{filteredSummary.totalPending}</p></div>
          <div><span className="text-gray-500">Total completed</span><p className="text-lg font-bold text-green-600">{filteredSummary.totalCompleted}</p></div>
        </div>
      </div>

      {/* Per-client blocks (filtered) */}
      {filteredClients.length > 0 ? (
        <div className="space-y-6">
          {filteredClients.map((block) => (
            <div key={block.client._id} className="box p-4 border border-gray-200 rounded-lg">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{block.client.name}</h3>
                <Link
                  href={`/analytics/clients/${block.client._id}/report`}
                  className="text-xs text-primary hover:underline"
                >
                  View client report
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                <div><span className="text-gray-500">Email</span><p className="text-gray-900 truncate">{block.client.email ?? "—"}</p></div>
                <div><span className="text-gray-500">Category</span><p className="text-gray-900">{block.client.category ?? "—"}</p></div>
                <div><span className="text-gray-500">Turnover ({block.financialYear})</span><p className="font-medium text-gray-900">{block.turnover ?? "—"}</p></div>
                <div><span className="text-gray-500">Status</span><p className="text-gray-900">P: {block.statusSummary.pending} · C: {block.statusSummary.completed} · D: {block.statusSummary.delayed}</p></div>
              </div>
              {block.turnoverHistory?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-medium text-gray-500 mb-1">Turnover history</p>
                  <div className="flex flex-wrap gap-2">
                    {block.turnoverHistory.map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">{h.year}: {h.turnover}</span>
                    ))}
                  </div>
                </div>
              )}
              {block.pendings.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-gray-500 mb-1">Pending / ongoing / delayed ({block.pendings.length})</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1 font-medium text-gray-600">Activity</th>
                          <th className="text-left py-1 font-medium text-gray-600">Status</th>
                          <th className="text-left py-1 font-medium text-gray-600">Due</th>
                          <th className="text-left py-1 font-medium text-gray-600">Completed AT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.pendings.slice(0, 5).map((t) => (
                          <tr key={t._id} className="border-b border-gray-50">
                            <td className="py-1 text-gray-900">{t.activity?.name ?? "—"}</td>
                            <td className="py-1"><span className="px-1 rounded bg-amber-100">{t.status}</span></td>
                            <td className="py-1 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                            <td className="py-1 text-gray-600">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {block.pendings.length > 5 && <p className="text-[10px] text-gray-500 mt-1">+{block.pendings.length - 5} more</p>}
                </div>
              )}
              {block.timelines.filter((t) => (t.status ?? "").toLowerCase() === "completed").length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-medium text-gray-500 mb-1">Completed ({block.timelines.filter((t) => (t.status ?? "").toLowerCase() === "completed").length})</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1 font-medium text-gray-600">Activity</th>
                          <th className="text-left py-1 font-medium text-gray-600">Subactivity</th>
                          <th className="text-left py-1 font-medium text-gray-600">Status</th>
                          <th className="text-left py-1 font-medium text-gray-600">Due</th>
                          <th className="text-left py-1 font-medium text-gray-600">Completed AT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.timelines
                          .filter((t) => (t.status ?? "").toLowerCase() === "completed")
                          .slice(0, 10)
                          .map((t) => (
                            <tr key={t._id} className="border-b border-gray-50">
                              <td className="py-1 text-gray-900">{t.activity?.name ?? "—"}</td>
                              <td className="py-1 text-gray-900">{t.subactivity?.name ?? "—"}</td>
                              <td className="py-1"><span className="px-1 rounded bg-green-100 text-green-800">{t.status}</span></td>
                              <td className="py-1 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                              <td className="py-1 text-gray-600">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {block.timelines.filter((t) => (t.status ?? "").toLowerCase() === "completed").length > 10 && (
                    <p className="text-[10px] text-gray-500 mt-1">+{block.timelines.filter((t) => (t.status ?? "").toLowerCase() === "completed").length - 10} more</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="box p-4 text-center text-sm text-gray-500">
          No clients in this group for the selected year{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
        </div>
      )}
    </div>
  );
};

export default GroupReportPage;
