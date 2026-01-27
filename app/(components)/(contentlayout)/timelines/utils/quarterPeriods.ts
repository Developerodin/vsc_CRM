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

/**
 * Format period for display in the register when frequency is Quarterly.
 * Maps backend period (e.g. "Q1-2024", "July-2024", "2024-07") to "Q1 (Jul–Sep) 2024" etc.
 * Returns period unchanged for non-Quarterly.
 */
export function formatPeriodDisplay(frequency: string, period: string): string {
  if (!period) return period;
  if (frequency?.toLowerCase() !== 'quarterly') return period;
  const qMatch = period.match(/Q([1-4])-(\d{4})/i);
  if (qMatch) {
    const q = `Q${qMatch[1]}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    const year = qMatch[2];
    return `${q} (${getQuarterRangeLabel(q)}) ${year}`;
  }
  const monthMatch = period.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[-\s]*(\d{4})?/i);
  if (monthMatch) {
    const q = getQuarterFromMonth(monthMatch[1]);
    const year = monthMatch[2] || new Date().getFullYear().toString();
    return `${q} (${getQuarterRangeLabel(q)}) ${year}`;
  }
  const isoMatch = period.match(/(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const monthNum = parseInt(isoMatch[2], 10);
    const q = getQuarterFromMonth(monthNum);
    return `${q} (${getQuarterRangeLabel(q)}) ${isoMatch[1]}`;
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
    const range = getQuarterRangeLabel(q);
    const displayName = year ? `Q${q.slice(1)} (${range}) ${year}` : `Q${q.slice(1)} (${range})`;
    return { ...p, quarter: q, displayName };
  });
}
