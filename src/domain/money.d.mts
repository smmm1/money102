export function parseMoneyCents(input: unknown): number | null
export function distributeCents(totalCents: number, participantIds: readonly unknown[]): number[]
export function calculateNetBalances(participants: Array<{id:string;paidCents:number;shareCents:number}>, settlements?: Array<{fromId:string;toId:string;amountCents:number}>): Map<string,number>
export function suggestSettlements(participants: Array<{id:string;paidCents:number;shareCents:number}>, settlements?: Array<{fromId:string;toId:string;amountCents:number}>): Array<{fromId:string;toId:string;amountCents:number}>
export function sleepDurationHours(bedtime: string, wakeTime: string): number | null
export function safeCsvCell(value: unknown): string
