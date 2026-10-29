export type SplitParticipant = { id: string; name: string; isMe: boolean };
export type SplitPayer = { participantId: string; amountSatang: number };
export type SplitExpense = {
  id: string;
  title: string;
  amountSatang: number;
  payerId: string;
  participantIds: string[];
  payers?: SplitPayer[];
  allocationMode?: "equal" | "fixed" | "percentage";
  allocations?: Record<string, number>;
};
export type SplitSettlement = { id: string; fromId: string; toId: string; amountSatang: number; date: string; note: string };
export type SplitResult = { balances: Record<string, number>; transfers: { fromId: string; toId: string; amountSatang: number }[] };
export type DraftSplitPreviewRow = {
  title: string;
  amount: string;
  participantNames: string[] | null;
  allocationMode: "equal" | "fixed" | "percentage";
  allocations: Record<string, string>;
};
export type DraftSplitPreview = { shares: Record<string, number>; invalidRows: number };
export function calculateSplit(expenses?: SplitExpense[], participants?: SplitParticipant[], settlements?: SplitSettlement[]): SplitResult;
export function calculateDraftSplitPreview(rows?: DraftSplitPreviewRow[], participantNames?: string[]): DraftSplitPreview;
export function calculateSleepDuration(start: string, end: string): { durationHours: number; normalizedEnd: string } | null;
export function buildDailyTrend(entries: { date: string; value: number | string }[], startDate: string, endDate: string, aggregate?: "last" | "sum"): { date: string; value: number | null }[];

export function calculateExpenseResponsibility(expenses: SplitExpense[], participantId: string): number | null;
export type BbqPersonalCostSummary = { totalSatang: number | null; knownCount: number; unknownCount: number; averageSatang: number | null; complete: boolean };
export function summarizeBbqPersonalCosts(visits?: { personalSatang?: number | null }[]): BbqPersonalCostSummary;

export function formatDateInTimezone(value: string, timezone?: string): string;

export type BillAdjustments = {
  serviceBasisPoints?: number;
  taxBasisPoints?: number;
  serviceIncluded?: boolean;
  taxIncluded?: boolean;
  discountSatang?: number;
};
export type BillAdjustmentSummary = {
  valid: boolean;
  error: string;
  baseTotalSatang: number;
  serviceSatang: number;
  taxSatang: number;
  preDiscountSatang: number;
  discountSatang: number;
  totalSatang: number;
  serviceBasisPoints: number;
  taxBasisPoints: number;
  serviceIncluded: boolean;
  taxIncluded: boolean;
};
export type AdjustedSplitResult = SplitResult & {
  valid: boolean;
  adjustmentSummary: BillAdjustmentSummary;
  baseTotalSatang: number;
  totalSatang: number;
  adjustedExpenses: SplitExpense[];
};
export function calculateBillAdjustmentSummary(baseTotalSatang: number, adjustments?: BillAdjustments): BillAdjustmentSummary;
export function calculateBillSplit(expenses?: SplitExpense[], participants?: SplitParticipant[], settlements?: SplitSettlement[], adjustments?: BillAdjustments): AdjustedSplitResult;
