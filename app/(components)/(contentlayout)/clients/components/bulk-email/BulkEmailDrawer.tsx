"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendBulk,
  getTemplateId,
  PLACEHOLDERS,
  ALLOWED_FROM_EMAILS,
  type EmailTemplate,
  type SendBulkResult,
} from "../../services/emailTemplateService";

const PLACEHOLDER_HINT = PLACEHOLDERS.join(", ");

interface ActivityItem {
  id?: string;
  _id?: string;
  name: string;
  subactivities?: Array<{ _id: string; name: string }>;
}

const getActivityId = (a: ActivityItem) => a.id ?? a._id ?? "";

type Tab = "templates" | "send";
type SendScope = "selected" | "branch" | "all";

export interface BulkEmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClientIds: string[];
  branchId: string | null;
  totalClientsCount?: number;
}

export function BulkEmailDrawer({
  isOpen,
  onClose,
  selectedClientIds,
  branchId,
  totalClientsCount = 0,
}: BulkEmailDrawerProps) {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", bodyHtml: "", bodyText: "", branch: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [templateActivityId, setTemplateActivityId] = useState("");
  const [templateSubactivityId, setTemplateSubactivityId] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showTemplateSelectModal, setShowTemplateSelectModal] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  const [sendTemplateId, setSendTemplateId] = useState("");
  const [fromEmail, setFromEmail] = useState<string>(ALLOWED_FROM_EMAILS[0]);
  const [sendScope, setSendScope] = useState<SendScope>(
    selectedClientIds.length > 0 ? "selected" : branchId ? "branch" : "all"
  );
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendBulkResult | null>(null);

  /** Recipients when scope is "selected": use only clients selected in the table on /clients. */
  const effectiveSelectedIds = sendScope === "selected" ? selectedClientIds : [];

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`${Base_url}activities?limit=1000`, {
        headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setActivities(data.results || []);
    } catch {
      setActivities([]);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const r = await listTemplates({
        limit: 100,
        sortBy: "createdAt:desc",
        branch: branchId ?? undefined,
        activity: templateActivityId || undefined,
        subactivity: templateSubactivityId || undefined,
      });
      setTemplates(r.results || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [branchId, templateActivityId, templateSubactivityId]);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
      setSendResult(null);
      setSendTemplateId("");
      setSendScope(selectedClientIds.length > 0 ? "selected" : branchId ? "branch" : "all");
      setTemplateActivityId("");
      setTemplateSubactivityId("");
      setShowTemplateSelectModal(false);
      setTemplateSearchQuery("");
    }
  }, [isOpen, selectedClientIds.length, branchId]);

  useEffect(() => {
    if (isOpen) fetchTemplates();
  }, [isOpen, fetchTemplates]);

  const selectedActivity = useMemo(() => activities.find((a) => getActivityId(a) === templateActivityId), [activities, templateActivityId]);
  const subactivities = selectedActivity?.subactivities ?? [];

  const templatesForSelectModal = useMemo(() => {
    const q = templateSearchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [templates, templateSearchQuery]);

  const selectedTemplate = useMemo(() => templates.find((t) => getTemplateId(t) === sendTemplateId), [templates, sendTemplateId]);

  const openCreate = () => {
    setFormMode("create");
    setEditingTemplate(null);
    setForm({ name: "", subject: "", bodyHtml: "", bodyText: "", branch: branchId ?? "" });
  };
  const openEdit = (t: EmailTemplate) => {
    setFormMode("edit");
    setEditingTemplate(t);
    setForm({
      name: t.name,
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      bodyText: t.bodyText ?? "",
      branch: t.branch ?? "",
    });
  };

  const tid = (t: EmailTemplate) => getTemplateId(t);
  const closeForm = () => {
    setFormMode("none");
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "edit" && editingTemplate) {
        await updateTemplate(getTemplateId(editingTemplate), {
          name: form.name.trim(),
          subject: form.subject.trim(),
          bodyHtml: form.bodyHtml.trim(),
          bodyText: form.bodyText.trim() || undefined,
          branch: form.branch.trim() || null,
        });
        toast.success("Template updated");
      } else {
        await createTemplate({
          name: form.name.trim(),
          subject: form.subject.trim(),
          bodyHtml: form.bodyHtml.trim(),
          bodyText: form.bodyText.trim() || undefined,
          branch: form.branch.trim() || null,
        });
        toast.success("Template created");
      }
      closeForm();
      fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      toast.success("Template deleted");
      if (editingTemplate && tid(editingTemplate) === id) closeForm();
      fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSend = async () => {
    if (!sendTemplateId) {
      toast.error("Select a template");
      return;
    }
    if (!fromEmail || !ALLOWED_FROM_EMAILS.includes(fromEmail as (typeof ALLOWED_FROM_EMAILS)[number])) {
      toast.error("Select a From email address");
      return;
    }
    if (sendScope === "selected" && effectiveSelectedIds.length === 0) {
      toast.error("Select clients from the table first, then send.");
      return;
    }
    const payload: { templateId: string; fromEmail: string; clientIds?: string[]; branchId?: string } = {
      templateId: sendTemplateId,
      fromEmail,
    };
    if (sendScope === "selected" && effectiveSelectedIds.length) payload.clientIds = effectiveSelectedIds;
    else if (sendScope === "branch" && branchId) payload.branchId = branchId;

    setSending(true);
    setSendResult(null);
    try {
      const res = await sendBulk(payload);
      setSendResult(res.data);
      toast.success(res.message || "Bulk send completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-label="Bulk email"
      >
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <i className="ri-mail-send-line text-xs" /> Bulk Email
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
            aria-label="Close"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            type="button"
            className={`flex-1 py-3 text-[11px] font-bold ${tab === "templates" ? "border-b-2 border-purple-600 text-purple-600" : "text-[#495057]"}`}
            onClick={() => setTab("templates")}
          >
            Templates
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-[11px] font-bold ${tab === "send" ? "border-b-2 border-purple-600 text-purple-600" : "text-[#495057]"}`}
            onClick={() => setTab("send")}
          >
            Send bulk
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px]">
          {tab === "templates" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Activity</label>
                  <select
                    className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 w-full focus:ring-0 focus:border-purple-300"
                    value={templateActivityId}
                    onChange={(e) => {
                      setTemplateActivityId(e.target.value);
                      setTemplateSubactivityId("");
                    }}
                  >
                    <option value="">All activities</option>
                    {activities.map((a) => (
                      <option key={getActivityId(a)} value={getActivityId(a)}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#495057] mb-1">Sub-activity</label>
                  <select
                    className="bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 w-full focus:ring-0 focus:border-purple-300 disabled:opacity-60"
                    value={templateSubactivityId}
                    onChange={(e) => setTemplateSubactivityId(e.target.value)}
                    disabled={!templateActivityId}
                  >
                    <option value="">All sub-activities</option>
                    {subactivities.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formMode !== "none" ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800">{formMode === "create" ? "New template" : "Edit template"}</h3>
                    <button type="button" onClick={closeForm} className="text-[11px] font-bold text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Template name *"
                    className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium transition-all"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Subject *"
                    className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium transition-all"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                  <div className="text-[10px] text-gray-500 mb-1">Placeholders: {PLACEHOLDER_HINT}</div>
                  <textarea
                    placeholder="HTML body (optional)"
                    className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full min-h-[120px] font-mono resize-y placeholder:text-gray-400"
                    value={form.bodyHtml}
                    onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                  />
                  <label className="block text-[11px] font-medium text-[#495057] mt-3 mb-1">
                    Plain text (optional)
                  </label>
                  <textarea
                    placeholder="Plain-text fallback for email clients that don’t support HTML"
                    className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full min-h-[120px] resize-y placeholder:text-gray-400"
                    value={form.bodyText}
                    onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
                    rows={5}
                  />
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : formMode === "create" ? "Create template" : "Update template"}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    onClick={openCreate}
                  >
                    <i className="ri-add-line text-xs" /> Create template
                  </button>
                  {loadingTemplates ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
                      <span className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-2">Loading templates</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-mail-line text-xl text-gray-200" />
                      </div>
                      <p className="text-xs font-bold text-gray-400">No templates yet. Create one above.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {templates.map((t) => (
                        <li
                          key={tid(t)}
                          className="border border-gray-200 rounded p-3 flex flex-col gap-2 bg-white"
                        >
                          <div className="text-[12px] font-medium text-[#323251]">{t.name}</div>
                          <div className="text-[11px] text-[#495057] truncate">{t.subject}</div>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded bg-emerald-50 text-emerald-400 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                              onClick={() => openEdit(t)}
                              title="Edit"
                            >
                              <i className="ri-pencil-line text-xs" />
                            </button>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 disabled:opacity-50 transition-colors"
                              onClick={() => handleDelete(tid(t))}
                              disabled={deletingId === tid(t)}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line text-xs" />
                            </button>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded bg-blue-50 text-blue-400 border border-blue-100 hover:bg-blue-100 transition-colors"
                              onClick={() => {
                                setSendTemplateId(tid(t));
                                setTab("send");
                              }}
                              title="Use to send"
                            >
                              <i className="ri-send-plane-line text-xs" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "send" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-1">Template</label>
                <button
                  type="button"
                  onClick={() => setShowTemplateSelectModal(true)}
                  className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 text-[11px] font-medium text-[#495057] rounded px-3 py-1.5 focus:ring-0 focus:border-purple-300 text-left"
                >
                  <span className="truncate">{selectedTemplate ? selectedTemplate.name : "Select template"}</span>
                  <i className="ri-arrow-down-s-line text-base text-gray-400 shrink-0" />
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-1">From email</label>
                <select
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 w-full focus:ring-0 focus:border-purple-300 appearance-none cursor-pointer"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                >
                  {ALLOWED_FROM_EMAILS.map((email) => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#495057] mb-2">Send to</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#323251]">
                    <input
                      type="radio"
                      name="scope"
                      checked={sendScope === "selected"}
                      onChange={() => setSendScope("selected")}
                      className="rounded border-gray-200 text-purple-600 focus:ring-0"
                    />
                    <span>Selected clients only</span>
                  </label>
                  {sendScope === "selected" && (
                    <div className="ml-5 mt-2 p-3 rounded bg-gray-50 border border-gray-200 text-[12px] text-[#495057]">
                      {effectiveSelectedIds.length > 0 ? (
                        <>
                          <strong>{effectiveSelectedIds.length}</strong> client(s) selected from the table.
                          <br />
                          <span className="text-gray-500">Select rows on the Clients table, then choose this option to send to those clients.</span>
                        </>
                      ) : (
                        <>
                          No clients selected from the table.
                          <br />
                          <span className="text-gray-500">Go to the Clients table above, tick the rows you want, then open Bulk Email and choose “Selected clients only”.</span>
                        </>
                      )}
                    </div>
                  )}
                  {branchId && (
                    <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#323251]">
                      <input
                        type="radio"
                        name="scope"
                        checked={sendScope === "branch"}
                        onChange={() => setSendScope("branch")}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0"
                      />
                      <span>All in this branch</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#323251]">
                    <input
                      type="radio"
                      name="scope"
                      checked={sendScope === "all"}
                      onChange={() => setSendScope("all")}
                      className="rounded border-gray-200 text-purple-600 focus:ring-0"
                    />
                    <span>All clients{totalClientsCount ? ` (${totalClientsCount})` : ""}</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-colors"
                onClick={handleSend}
                disabled={sending || !sendTemplateId || !fromEmail}
              >
                {sending ? "Sending..." : "Send bulk email"}
              </button>
              {sendResult && (
                <div className="border border-gray-200 rounded p-3 space-y-2 bg-gray-50 text-[12px]">
                  <div className="font-bold text-[#323251]">Result</div>
                  <div>Sent: <span className="text-green-600">{sendResult.sent}</span></div>
                  <div>Failed: <span className="text-red-600">{sendResult.failed}</span></div>
                  <div>Skipped (no email): <span className="text-gray-600">{sendResult.skipped}</span></div>
                  {sendResult.errors && sendResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium text-red-700">Errors:</div>
                      <ul className="list-disc list-inside text-xs text-red-700">
                        {sendResult.errors.map((err, i) => (
                          <li key={i}>{err.email}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template selection modal (search + list) */}
      {showTemplateSelectModal && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" aria-hidden onClick={() => { setShowTemplateSelectModal(false); setTemplateSearchQuery(""); }} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col pointer-events-auto" role="dialog" aria-label="Select template">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between gap-2">
                <h3 className="text-[0.875rem] font-bold text-gray-800">Select template</h3>
                <button type="button" onClick={() => { setShowTemplateSelectModal(false); setTemplateSearchQuery(""); }} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100">
                  <i className="ri-close-line text-lg" />
                </button>
              </div>
              <div className="p-3 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search by name or subject..."
                  className="w-full bg-white border border-gray-200 pl-3 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                {templatesForSelectModal.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-[#495057]">
                    {templateSearchQuery ? "No templates match your search." : "No templates. Add activity/sub-activity filters or create a template."}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {templatesForSelectModal.map((t) => (
                      <li key={tid(t)}>
                        <button
                          type="button"
                          onClick={() => {
                            setSendTemplateId(tid(t));
                            setShowTemplateSelectModal(false);
                            setTemplateSearchQuery("");
                          }}
                          className="w-full text-left px-3 py-2 rounded border border-gray-100 hover:bg-purple-50 hover:border-purple-200 text-[12px] font-medium text-[#323251]"
                        >
                          <div>{t.name}</div>
                          {t.subject && <div className="text-[11px] text-[#495057] truncate mt-0.5">{t.subject}</div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
