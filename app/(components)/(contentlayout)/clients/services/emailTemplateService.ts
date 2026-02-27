/**
 * Email template and bulk-send API client.
 * Base: BULK_EMAIL_FRONTEND_SETUP.md – /v1/email-templates, /v1/email-templates/send-bulk
 */

import { Base_url } from "@/app/api/config/BaseUrl";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
  "Content-Type": "application/json",
});

export interface EmailTemplate {
  _id?: string;
  id?: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  branch?: string | null;
  activity?: string | null;
  subactivity?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Always use this when sending templateId to the API – backend expects MongoDB id, not name. */
export function getTemplateId(t: EmailTemplate): string {
  const id = t._id ?? t.id;
  if (!id || typeof id !== "string") throw new Error("Template has no id");
  return id;
}

export interface TemplatesListResponse {
  success: boolean;
  results: EmailTemplate[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/** Allowed from-addresses for bulk send (API whitelist). */
export const ALLOWED_FROM_EMAILS = [
  "info@vsc.co.in",
  "audit@vsc.co.in",
  "incometax@vsc.co.in",
  "roc@vsc.co.in",
  "gst@vsc.co.in",
] as const;

export type AllowedFromEmail = (typeof ALLOWED_FROM_EMAILS)[number];

export interface SendBulkPayload {
  templateId: string;
  fromEmail: string;
  clientIds?: string[];
  branchId?: string;
}

export interface SendBulkResult {
  sent: number;
  failed: number;
  skipped: number;
  errors?: Array<{ clientId: string; email: string; error: string }>;
}

export interface SendBulkResponse {
  success: boolean;
  message: string;
  data: SendBulkResult;
}

/** List templates with optional branch, activity, subactivity, sort, pagination */
export async function listTemplates(params?: {
  branch?: string;
  activity?: string;
  subactivity?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<TemplatesListResponse> {
  const q = new URLSearchParams();
  if (params?.branch) q.set("branch", params.branch);
  if (params?.activity) q.set("activity", params.activity);
  if (params?.subactivity) q.set("subactivity", params.subactivity);
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.page != null) q.set("page", String(params.page));
  const url = `${Base_url}email-templates${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to list templates");
  return json;
}

/** Get one template by id */
export async function getTemplate(templateId: string): Promise<EmailTemplate> {
  const res = await fetch(`${Base_url}email-templates/${templateId}`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Template not found");
  return json.data;
}

/** Create template */
export async function createTemplate(body: {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  branch?: string | null;
}): Promise<EmailTemplate> {
  const res = await fetch(`${Base_url}email-templates`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: body.name,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText ?? "",
      branch: body.branch ?? null,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create template");
  return json.data;
}

/** Update template (partial) */
export async function updateTemplate(
  templateId: string,
  body: Partial<Pick<EmailTemplate, "name" | "subject" | "bodyHtml" | "bodyText" | "branch">>
): Promise<EmailTemplate> {
  const res = await fetch(`${Base_url}email-templates/${templateId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to update template");
  return json.data;
}

/** Delete template */
export async function deleteTemplate(templateId: string): Promise<void> {
  const res = await fetch(`${Base_url}email-templates/${templateId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (res.status === 204) return;
  const json = await res.json().catch(() => ({}));
  throw new Error(json.message || "Failed to delete template");
}

/** Send bulk email. Use exactly one of clientIds, branchId, or neither (all clients). fromEmail must be one of ALLOWED_FROM_EMAILS. */
export async function sendBulk(payload: SendBulkPayload): Promise<SendBulkResponse> {
  const body: Record<string, unknown> = {
    templateId: payload.templateId,
    fromEmail: payload.fromEmail,
  };
  if (payload.clientIds?.length) body.clientIds = payload.clientIds;
  else if (payload.branchId) body.branchId = payload.branchId;
  const res = await fetch(`${Base_url}email-templates/send-bulk`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Bulk send failed");
  return json;
}

export const PLACEHOLDERS = [
  "{{clientName}}",
  "{{companyName}}",
  "{{email}}",
  "{{email2}}",
  "{{phone}}",
  "{{address}}",
  "{{district}}",
  "{{state}}",
  "{{country}}",
] as const;
