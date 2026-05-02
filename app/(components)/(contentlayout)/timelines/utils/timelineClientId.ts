/**
 * Activity-based client ID display for timelines and compliance register.
 * GST → GST number; TDS → TIN; ITR → PAN only; ROC → CIN only; Audit/Other → PAN / CIN.
 */

export type ClientIdType = 'gst' | 'tds' | 'itr' | 'roc' | 'roc_audit';

/** Resolve which client ID type to show from activity/subActivity name */
export function getClientIdType(activityName?: string, subActivityName?: string): ClientIdType {
  const act = (activityName || '').toLowerCase();
  const sub = (subActivityName || '').toLowerCase();
  if (act.includes('gst') || sub.includes('gstr-1') || sub.includes('gstr-3b')) return 'gst';
  if (act.includes('tds') || sub.includes('tds')) return 'tds';
  if (act.includes('income tax') || act.includes('itr') || sub.includes('itr')) return 'itr';
  if (act.includes('roc')) return 'roc';
  return 'roc_audit';
}

interface TimelineLike {
  activity?: { name?: string };
  subactivity?: { name?: string };
  /** Top-level state (e.g. task API timeline.state "Rajasthan") */
  state?: string;
  client?: {
    pan?: string;
    tanNumber?: string;
    cinNumber?: string;
    state?: string;
    gstNumbers?: Array<{ state?: string; gstNumber?: string }>;
  };
  /** Task/timeline API often returns GST here (e.g. metadata.gstNumber, metadata.gstState) */
  metadata?: { gstState?: string; gstNumber?: string };
}

/**
 * Raw GST jurisdiction state from timeline + client profile (no single-GST inference).
 */
function baseGstStateFromTimeline(t: TimelineLike): string {
  return (
    (t.metadata?.gstState || '').trim() ||
    (typeof t.state === 'string' ? t.state.trim() : '') ||
    (t.client?.state || '').trim()
  );
}

/**
 * Resolved GST state for display and GSTIN lookup: metadata → top-level timeline.state → client.state,
 * then for GST activities only, one registration row when exactly one gstNumbers entry exists.
 *
 * @param t - Timeline-like payload from API
 * @returns Normalized state name or empty string
 */
export function resolveGstDisplayState(t: TimelineLike): string {
  const direct = baseGstStateFromTimeline(t);
  if (direct) return direct;
  const activityName = t.activity?.name;
  const subActivityName = t.subactivity?.name;
  if (getClientIdType(activityName, subActivityName) !== 'gst') return '';
  const list = t.client?.gstNumbers;
  if (!Array.isArray(list) || list.length !== 1) return '';
  return (list[0]?.state || '').trim();
}

export function gstNumberForState(t: TimelineLike): string {
  // Prefer timeline-level metadata (how task API returns GST)
  if (t.metadata?.gstNumber) return t.metadata.gstNumber;
  const state = resolveGstDisplayState(t);
  const list = t.client?.gstNumbers || [];
  if (!state || !Array.isArray(list)) return list?.[0]?.gstNumber ?? '';
  const found = list.find((g) => (g.state || '').toLowerCase() === state.toLowerCase());
  return found?.gstNumber ?? list?.[0]?.gstNumber ?? '';
}

/** All client IDs for timeline export (GST State, GST No, TIN, PAN, CIN) so users can fill timelines effectively */
export function getClientIdsForExport(timeline: TimelineLike): {
  gstState: string;
  gstNumber: string;
  tin: string;
  pan: string;
  cin: string;
} {
  return {
    gstState: resolveGstDisplayState(timeline),
    gstNumber: gstNumberForState(timeline),
    tin: timeline.client?.tanNumber || '',
    pan: timeline.client?.pan || '',
    cin: timeline.client?.cinNumber || '',
  };
}

/** Get display label and value for the activity-appropriate client ID (for timeline list/register). */
export function getClientIdDisplay(timeline: TimelineLike): { idLabel: string; idValue: string } {
  const activityName = timeline.activity?.name;
  const subActivityName = timeline.subactivity?.name;
  const idType = getClientIdType(activityName, subActivityName);

  if (idType === 'gst') {
    const gstState = resolveGstDisplayState(timeline);
    return {
      idLabel: gstState ? `GST (${gstState})` : 'GST No.',
      idValue: gstNumberForState(timeline),
    };
  }
  if (idType === 'tds') {
    return { idLabel: 'TIN', idValue: timeline.client?.tanNumber || '' };
  }
  if (idType === 'itr') {
    return { idLabel: 'PAN', idValue: timeline.client?.pan || '' };
  }
  if (idType === 'roc') {
    return { idLabel: 'CIN', idValue: timeline.client?.cinNumber || '' };
  }
  const pan = timeline.client?.pan || '';
  const cin = timeline.client?.cinNumber || '';
  return {
    idLabel: 'PAN / CIN',
    idValue: [pan, cin].filter(Boolean).join(' / ') || '',
  };
}
