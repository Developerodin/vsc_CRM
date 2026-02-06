/**
 * Timeline register quarter mapping:
 * July = Q1, October = Q2, January = Q3, May = Q4
 * Q1: Jul–Sep, Q2: Oct–Dec, Q3: Jan–Mar, Q4: Apr–Jun
 */

const MONTH_TO_NUM: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

const MONTH_NUM_TO_QUARTER: Record<number, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
  1: 'Q3', 2: 'Q3', 3: 'Q3',   // Jan–Mar = Q3
  4: 'Q4', 5: 'Q4', 6: 'Q4',   // Apr–Jun = Q4
  7: 'Q1', 8: 'Q1', 9: 'Q1',   // Jul–Sep = Q1
  10: 'Q2', 11: 'Q2', 12: 'Q2', // Oct–Dec = Q2
};

const QUARTER_RANGES: Record<string, string> = {
  Q1: 'Jul–Sep',
  Q2: 'Oct–Dec',
  Q3: 'Jan–Mar',
  Q4: 'Apr–Jun',
};

/** Get quarter (Q1–Q4) from month name or 1–12. July=Q1, Oct=Q2, Jan=Q3, May=Q4. */
export function getQuarterFromMonth(month: string | number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const n = typeof month === 'number'
    ? month
    : (MONTH_TO_NUM[month] ?? (parseInt(String(month), 10) || 0));
  return MONTH_NUM_TO_QUARTER[n] ?? 'Q1';
}

/** Get short range label for a quarter, e.g. "Jul–Sep". */
export function getQuarterRangeLabel(quarter: string): string {
  return QUARTER_RANGES[quarter] ?? quarter;
}

/** Normalize monthly period to YYYY-MM for comparison (API may return "February-2026", we send "2026-02"). */
export function normalizeMonthlyPeriodKey(period: string): string {
  if (!period?.trim()) return '';
  const p = period.trim();
  const iso = p.match(/^(\d{4})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}`;
  const monthYear = p.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[-\s]*(\d{4})/i);
  if (monthYear) {
    const monthNum = MONTH_TO_NUM[monthYear[1]];
    if (monthNum) return `${monthYear[2]}-${String(monthNum).padStart(2, '0')}`;
  }
  return p;
}

/** Format single calendar year to FY range for display (e.g. "2024" → "2024-2025"). */
export function formatYearlyPeriodDisplay(period: string): string {
  if (!period || !/^\d{4}$/.test(period.trim())) return period;
  const y = parseInt(period.trim(), 10);
  return `${y}-${y + 1}`;
}

/**
 * Format period for display in the register when frequency is Quarterly or Yearly.
 * Quarterly: maps to quarter + year only, e.g. "Q3 2026".
 * Yearly: maps single year to FY range, e.g. "2024" → "2024-2025".
 */
export function formatPeriodDisplay(frequency: string, period: string): string {
  if (!period) return period;
  const freq = frequency?.toLowerCase();
  if (freq === 'yearly') return formatYearlyPeriodDisplay(period);
  if (freq !== 'quarterly') return period;
  const qMatch = period.match(/Q([1-4])-(\d{4})/i);
  if (qMatch) {
    const q = `Q${qMatch[1]}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    const year = qMatch[2];
    return `${q} ${year}`;
  }
  const monthMatch = period.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[-\s]*(\d{4})?/i);
  if (monthMatch) {
    const q = getQuarterFromMonth(monthMatch[1]);
    const year = monthMatch[2] || new Date().getFullYear().toString();
    return `${q} ${year}`;
  }
  const isoMatch = period.match(/(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const monthNum = parseInt(isoMatch[2], 10);
    const q = getQuarterFromMonth(monthNum);
    return `${q} ${isoMatch[1]}`;
  }
  return period;
}

export interface FrequencyPeriod {
  period?: string;
  quarter?: string;
  months?: string[];
  startDate?: string;
  endDate?: string;
  displayName?: string;
  financialYear?: string;
}

/**
 * Normalize quarterly periods so Q1=Jul–Sep, Q2=Oct–Dec, Q3=Jan–Mar, Q4=Apr–Jun.
 * Use when displaying periods for "Quarterly" frequency in register and timelines.
 */
export function normalizeQuarterlyPeriods<T extends FrequencyPeriod>(periods: T[]): T[] {
  return periods.map((p) => {
    let q: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
    let year = '';
    if (p.months?.length) {
      q = getQuarterFromMonth(p.months[0]);
    } else if (p.startDate) {
      const m = new Date(p.startDate).getMonth() + 1; // 1–12
      q = getQuarterFromMonth(m);
      year = p.startDate.slice(0, 4);
    } else if (p.period) {
      const m = p.period.match(/Q[1-4]-(\d{4})/);
      if (m) year = m[1];
      const existing = (p.quarter ?? p.period.slice(0, 2)) as string;
      if (existing === 'Q1' || existing === 'Q2' || existing === 'Q3' || existing === 'Q4') {
        q = existing;
      }
    }
    if (!year && p.financialYear) {
      const fy = String(p.financialYear);
      year = fy.includes('-') ? fy.split('-')[0] : fy.slice(0, 4);
    }
    const displayName = year ? `${q} ${year}` : q;
    return { ...p, quarter: q, displayName };
  });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Generate period options for past 3 and future 3 years (7 years total) for a frequency. */
export function getExtendedPeriodOptions(frequency: string): Array<{ period: string; displayName: string }> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 3;
  const endYear = currentYear + 3;
  const result: Array<{ period: string; displayName: string }> = [];

  const freq = (frequency || '').toLowerCase();

  if (freq === 'quarterly') {
    for (let y = startYear; y <= endYear; y++) {
      for (let q = 1; q <= 4; q++) {
        result.push({ period: `Q${q}-${y}`, displayName: `Q${q} ${y}` });
      }
    }
    return result;
  }

  if (freq === 'yearly') {
    for (let y = startYear; y <= endYear; y++) {
      result.push({ period: String(y), displayName: `${y}-${y + 1}` });
    }
    return result;
  }

  if (freq === 'monthly') {
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 1; m <= 12; m++) {
        const monthName = MONTH_NAMES[m - 1];
        const period = `${y}-${String(m).padStart(2, '0')}`;
        result.push({ period, displayName: `${monthName} ${y}` });
      }
    }
    return result;
  }

  if (freq === 'onetime' || freq === 'one time') {
    for (let y = startYear; y <= endYear; y++) {
      result.push({ period: String(y), displayName: String(y) });
    }
    return result;
  }

  return result;
}

/** For yearly: normalize to start year so "2025" and "2025-2026" map to same key. */
function yearlyPeriodKey(period: string): string {
  const p = (period || '').trim();
  if (/^\d{4}$/.test(p)) return p;
  const match = p.match(/^(\d{4})-\d{4}$/);
  return match ? match[1] : p;
}

/** Merge API periods with extended past/future 3 years; dedupe by period, sort by period. */
export function mergeWithExtendedPeriods<T extends { period?: string; displayName?: string }>(
  frequency: string,
  apiPeriods: T[]
): T[] {
  const extended = getExtendedPeriodOptions(frequency);
  const byPeriod = new Map<string, T>();
  const freq = (frequency || '').toLowerCase();
  const isYearly = freq === 'yearly';

  apiPeriods.forEach((p) => {
    const raw = (p.period || '').trim();
    if (!raw) return;
    const key = isYearly ? yearlyPeriodKey(raw) : raw;
    const displayName = isYearly && /^\d{4}$/.test(raw) && !p.displayName?.includes('-')
      ? formatYearlyPeriodDisplay(raw)
      : (p.displayName ?? (isYearly ? formatYearlyPeriodDisplay(yearlyPeriodKey(raw)) : raw));
    byPeriod.set(key, { ...p, period: raw, displayName } as T);
  });
  extended.forEach((e) => {
    const key = isYearly ? yearlyPeriodKey(e.period) : e.period;
    if (!byPeriod.has(key)) {
      byPeriod.set(key, { ...e, period: e.period, displayName: e.displayName } as T);
    }
  });
  return Array.from(byPeriod.values()).sort((a, b) => {
    const pa = a.period || '';
    const pb = b.period || '';
    return pa.localeCompare(pb, undefined, { numeric: true });
  });
}
