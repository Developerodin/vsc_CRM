"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendBulk,
  getTemplateId,
  PLACEHOLDERS,
  type EmailTemplate,
  type SendBulkResult,
} from "../../services/emailTemplateService";

const PLACEHOLDER_HINT = PLACEHOLDERS.join(", ");

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

  const [sendTemplateId, setSendTemplateId] = useState("");
  const [sendScope, setSendScope] = useState<SendScope>(
    selectedClientIds.length > 0 ? "selected" : branchId ? "branch" : "all"
  );
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendBulkResult | null>(null);

  /** Recipients when scope is "selected": use only clients selected in the table on /clients. */
  const effectiveSelectedIds = sendScope === "selected" ? selectedClientIds : [];

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const r = await listTemplates({ limit: 100, sortBy: "createdAt:desc", branch: branchId ?? undefined });
      setTemplates(r.results || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setSendResult(null);
      setSendTemplateId("");
      setSendScope(selectedClientIds.length > 0 ? "selected" : branchId ? "branch" : "all");
    }
  }, [isOpen, fetchTemplates, selectedClientIds.length, branchId]);

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
    if (sendScope === "selected" && effectiveSelectedIds.length === 0) {
      toast.error("Select clients from the table first, then send.");
      return;
    }
    const payload: { templateId: string; clientIds?: string[]; branchId?: string } = {
      templateId: sendTemplateId,
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
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-label="Bulk email"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 bg-primary text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <i className="ri-mail-send-line" /> Bulk Email
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20"
            aria-label="Close"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-medium ${tab === "templates" ? "border-b-2 border-primary text-primary" : "text-gray-600"}`}
            onClick={() => setTab("templates")}
          >
            Templates
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-medium ${tab === "send" ? "border-b-2 border-primary text-primary" : "text-gray-600"}`}
            onClick={() => setTab("send")}
          >
            Send bulk
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "templates" && (
            <div className="space-y-4">
              {formMode !== "none" ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{formMode === "create" ? "New template" : "Edit template"}</h3>
                    <button type="button" onClick={closeForm} className="text-gray-500 hover:text-gray-700 text-sm">
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Template name *"
                    className="form-control w-full"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Subject *"
                    className="form-control w-full"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                  <div className="text-xs text-gray-500 mb-1">Placeholders: {PLACEHOLDER_HINT}</div>
                  <textarea
                    placeholder="HTML body (optional)"
                    className="form-control w-full min-h-[120px] font-mono text-sm"
                    value={form.bodyHtml}
                    onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                  />
                  <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                    Plain text (optional)
                  </label>
                  <textarea
                    placeholder="Plain-text fallback for email clients that don’t support HTML"
                    className="form-control w-full min-h-[120px] text-sm resize-y"
                    value={form.bodyText}
                    onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
                    rows={5}
                  />
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
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
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    onClick={openCreate}
                  >
                    <i className="ri-add-line text-base" /> Create template
                  </button>
                  {loadingTemplates ? (
                    <div className="py-6 text-center text-gray-500 text-sm">Loading templates...</div>
                  ) : templates.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 text-sm">No templates yet. Create one above.</div>
                  ) : (
                    <ul className="space-y-2">
                      {templates.map((t) => (
                        <li
                          key={tid(t)}
                          className="border rounded-lg p-3 flex flex-col gap-2"
                        >
                          <div className="font-medium text-sm">{t.name}</div>
                          <div className="text-xs text-gray-600 truncate">{t.subject}</div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                              onClick={() => openEdit(t)}
                              title="Edit"
                            >
                              <i className="ri-edit-line text-base" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                              onClick={() => handleDelete(tid(t))}
                              disabled={deletingId === tid(t)}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line text-base" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-2 rounded-md text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSendTemplateId(tid(t));
                                setTab("send");
                              }}
                              title="Use to send"
                            >
                              <i className="ri-send-plane-line text-base" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  className="form-select w-full"
                  value={sendTemplateId}
                  onChange={(e) => setSendTemplateId(e.target.value)}
                >
                  <option value="">Select template</option>
                  {templates.map((t) => (
                    <option key={tid(t)} value={tid(t)}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send to</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={sendScope === "selected"}
                      onChange={() => setSendScope("selected")}
                    />
                    <span>Selected clients only</span>
                  </label>
                  {sendScope === "selected" && (
                    <div className="ml-5 mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        checked={sendScope === "branch"}
                        onChange={() => setSendScope("branch")}
                      />
                      <span>All in this branch</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={sendScope === "all"}
                      onChange={() => setSendScope("all")}
                    />
                    <span>All clients{totalClientsCount ? ` (${totalClientsCount})` : ""}</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleSend}
                disabled={sending || !sendTemplateId}
              >
                {sending ? "Sending..." : "Send bulk email"}
              </button>
              {sendResult && (
                <div className="border rounded-lg p-3 space-y-2 bg-gray-50 text-sm">
                  <div className="font-medium">Result</div>
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

    </>
  );
}
