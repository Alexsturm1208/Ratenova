// ============================================================
// SchuldenFrei — Type Definitions
// Shared across frontend, services, and admin
// ============================================================

export interface Profile {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium';
  premium_until: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  original_amount: number;
  paid_amount: number;
  monthly_rate: number;
  plan_status: 'open' | 'negotiation' | 'rate';
  due_date: string | null;
  notes: string;
  creditor_name: string;
  creditor_address: string;
  creditor_phone: string;
  creditor_email: string;
  bank_name: string;
  bank_iban: string;
  bank_bic: string;
  bank_ref: string;
  created_at: string;
}

export interface DebtInsert {
  name: string;
  emoji?: string;
  original_amount: number;
  monthly_rate: number;
  plan_status?: 'open' | 'negotiation' | 'rate';
  due_date?: string;
  notes?: string;
  creditor_name?: string;
  creditor_address?: string;
  creditor_phone?: string;
  creditor_email?: string;
  bank_name?: string;
  bank_iban?: string;
  bank_bic?: string;
  bank_ref?: string;
}

export interface DebtUpdate {
  name?: string;
  emoji?: string;
  monthly_rate?: number;
  plan_status?: 'open' | 'negotiation' | 'rate';
  due_date?: string;
  notes?: string;
  creditor_name?: string;
  creditor_address?: string;
  creditor_phone?: string;
  creditor_email?: string;
  bank_name?: string;
  bank_iban?: string;
  bank_bic?: string;
  bank_ref?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  debt_id: string;
  date: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface PaymentInsert {
  debt_id: string;
  amount: number;
  date?: string;
  note?: string;
}

export interface Agreement {
  id: string;
  user_id: string;
  debt_id: string | null;
  type: string;
  content: string;
  created_at: string;
}

export interface AgreementInsert {
  debt_id?: string;
  type: string;
  content: string;
}

// ── Computed / UI types ──

export type DebtStatus = 'ok' | 'soon' | 'today' | 'overdue' | 'done' | 'pending';

export interface DashboardTotals {
  originalTotal: number;
  paidTotal: number;
  remaining: number;
  monthlyTotal: number;
  percentPaid: number;
  debtCount: number;
  activeCount: number;
  doneCount: number;
  nextDue: Debt | null;
}

// ── Admin types ──

export interface AdminCustomerSummary {
  profile: Profile;
  kpis: DashboardTotals;
  debts: Debt[];
  payments: Payment[];
  agreements: Agreement[];
}

// ── Service response wrapper ──

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ── Budget ──

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  created_at: string;
}

export interface RecurringExpenseInsert {
  name: string;
  amount: number;
  category?: string;
}

export interface RecurringIncome {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  created_at: string;
}

export interface RecurringIncomeInsert {
  name: string;
  amount: number;
  category?: string;
}
