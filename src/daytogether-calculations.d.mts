export type SplitParticipant = { id: string; name: string; isMe: boolean };
export type SplitExpense = { id: string; title: string; amountSatang: number; payerId: string; participantIds: string[] };
export type SplitSettlement = { id: string; fromId: string; toId: string; amountSatang: number; date: string; note: string };
export function calculateSplit(expenses: SplitExpense[], participants: SplitParticipant[], settlements?: SplitSettlement[]): { balances: Record<string, number>; transfers: { fromId: string; toId: string; amountSatang: number }[] };
