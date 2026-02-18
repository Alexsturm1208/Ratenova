// ============================================================
// Service Layer — All database operations
// Each function gets a Supabase client passed in (either
// user-scoped via RLS, or admin service-role for admin panel)
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Debt, DebtInsert, DebtUpdate,
  Payment, PaymentInsert,
  Agreement, AgreementInsert,
  Profile, ServiceResult, DashboardTotals,
  RecurringExpense, RecurringExpenseInsert,
  RecurringIncome, RecurringIncomeInsert,
} from '@/types';
import { sanitize } from './validation';

// ── Profile ──

export async function getProfile(
  supabase: SupabaseClient, userId: string
): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return { data: null, error: 'Profil konnte nicht geladen werden.' };
  return { data, error: null };
}

export async function updateProfile(
  supabase: SupabaseClient, userId: string, updates: { name?: string }
): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name: sanitize(updates.name, 200) })
    .eq('id', userId)
    .select()
    .single();
  if (error) return { data: null, error: 'Profil konnte nicht aktualisiert werden.' };
  return { data, error: null };
}

// ── Debts ──

export async function getDebts(
  supabase: SupabaseClient
): Promise<ServiceResult<Debt[]>> {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: 'Schulden konnten nicht geladen werden.' };
  return { data: data ?? [], error: null };
}

export async function getDebt(
  supabase: SupabaseClient, debtId: string
): Promise<ServiceResult<Debt>> {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .single();
  if (error) return { data: null, error: 'Schuld nicht gefunden.' };
  return { data, error: null };
}

export async function createDebt(
  supabase: SupabaseClient, userId: string, input: DebtInsert
): Promise<ServiceResult<Debt>> {
  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: userId,
      name: sanitize(input.name, 200),
      emoji: sanitize(input.emoji, 10) || '📄',
      original_amount: Number(input.original_amount),
      paid_amount: 0,
      monthly_rate: Number(input.monthly_rate),
      plan_status: input.plan_status || 'open',
      due_date: input.due_date || null,
      notes: sanitize(input.notes),
      creditor_name: sanitize(input.creditor_name),
      creditor_address: sanitize(input.creditor_address),
      creditor_phone: sanitize(input.creditor_phone, 50),
      creditor_email: sanitize(input.creditor_email, 200),
      bank_name: sanitize(input.bank_name),
      bank_iban: sanitize(input.bank_iban, 40),
      bank_bic: sanitize(input.bank_bic, 20),
      bank_ref: sanitize(input.bank_ref),
    })
    .select()
    .single();

  if (error) {
    // Catch the trigger-raised free limit error
    if (error.message?.includes('FREE_LIMIT_REACHED')) {
      return { data: null, error: 'Du hast das Limit von 5 Schulden erreicht. Upgrade auf Premium für unbegrenzte Einträge.' };
    }
    return { data: null, error: 'Schuld konnte nicht erstellt werden.' };
  }
  return { data, error: null };
}

export async function updateDebt(
  supabase: SupabaseClient, debtId: string, input: DebtUpdate
): Promise<ServiceResult<Debt>> {
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = sanitize(input.name, 200);
  if (input.emoji !== undefined) updates.emoji = sanitize(input.emoji, 10);
  if (input.monthly_rate !== undefined) updates.monthly_rate = Number(input.monthly_rate);
  if (input.plan_status !== undefined) updates.plan_status = input.plan_status;
  if (input.due_date !== undefined) updates.due_date = input.due_date || null;
  if (input.notes !== undefined) updates.notes = sanitize(input.notes);
  if (input.creditor_name !== undefined) updates.creditor_name = sanitize(input.creditor_name);
  if (input.creditor_address !== undefined) updates.creditor_address = sanitize(input.creditor_address);
  if (input.creditor_phone !== undefined) updates.creditor_phone = sanitize(input.creditor_phone, 50);
  if (input.creditor_email !== undefined) updates.creditor_email = sanitize(input.creditor_email, 200);
  if (input.bank_name !== undefined) updates.bank_name = sanitize(input.bank_name);
  if (input.bank_iban !== undefined) updates.bank_iban = sanitize(input.bank_iban, 40);
  if (input.bank_bic !== undefined) updates.bank_bic = sanitize(input.bank_bic, 20);
  if (input.bank_ref !== undefined) updates.bank_ref = sanitize(input.bank_ref);

  const { data, error } = await supabase
    .from('debts')
    .update(updates)
    .eq('id', debtId)
    .select()
    .single();
  if (error) return { data: null, error: 'Schuld konnte nicht aktualisiert werden.' };
  return { data, error: null };
}

export async function deleteDebt(
  supabase: SupabaseClient, debtId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debtId);
  if (error) return { data: null, error: 'Schuld konnte nicht gelöscht werden.' };
  return { data: null, error: null };
}

// ── Payments ──

export async function getPayments(
  supabase: SupabaseClient, debtId?: string
): Promise<ServiceResult<Payment[]>> {
  let query = supabase
    .from('payments')
    .select('*')
    .order('date', { ascending: false });

  if (debtId) query = query.eq('debt_id', debtId);

  const { data, error } = await query;
  if (error) return { data: null, error: 'Zahlungen konnten nicht geladen werden.' };
  return { data: data ?? [], error: null };
}

export async function createPayment(
  supabase: SupabaseClient, userId: string, input: PaymentInsert
): Promise<ServiceResult<Payment>> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      debt_id: input.debt_id,
      amount: Number(input.amount),
      date: input.date || new Date().toISOString().split('T')[0],
      note: sanitize(input.note),
    })
    .select()
    .single();
  if (error) return { data: null, error: 'Zahlung konnte nicht erfasst werden.' };
  return { data, error: null };
}

export async function deletePayment(
  supabase: SupabaseClient, paymentId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId);
  if (error) return { data: null, error: 'Zahlung konnte nicht gelöscht werden.' };
  return { data: null, error: null };
}

// ── Agreements ──

export async function getAgreements(
  supabase: SupabaseClient, debtId?: string
): Promise<ServiceResult<Agreement[]>> {
  let query = supabase
    .from('agreements')
    .select('*')
    .order('created_at', { ascending: false });

  if (debtId) query = query.eq('debt_id', debtId);

  const { data, error } = await query;
  if (error) return { data: null, error: 'Vereinbarungen konnten nicht geladen werden.' };
  return { data: data ?? [], error: null };
}

export async function createAgreement(
  supabase: SupabaseClient, userId: string, input: AgreementInsert
): Promise<ServiceResult<Agreement>> {
  const { data, error } = await supabase
    .from('agreements')
    .insert({
      user_id: userId,
      debt_id: input.debt_id || null,
      type: sanitize(input.type, 50),
      content: input.content, // full text, not truncated
    })
    .select()
    .single();
  if (error) return { data: null, error: 'Vereinbarung konnte nicht gespeichert werden.' };
  return { data, error: null };
}

// ── Dashboard Totals (computed) ──

export function computeTotals(debts: Debt[]): DashboardTotals {
  const originalTotal = debts.reduce((s, d) => s + d.original_amount, 0);
  const paidTotal = debts.reduce((s, d) => s + d.paid_amount, 0);
  const remaining = originalTotal - paidTotal;
  const active = debts.filter(d => d.paid_amount < d.original_amount);
  const monthlyTotal = active.reduce((s, d) => s + d.monthly_rate, 0);
  const sorted = [...active]
    .filter(d => d.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  return {
    originalTotal,
    paidTotal,
    remaining,
    monthlyTotal,
    percentPaid: originalTotal === 0 ? 100 : Math.round((paidTotal / originalTotal) * 100),
    debtCount: debts.length,
    activeCount: active.length,
    doneCount: debts.length - active.length,
    nextDue: sorted[0] ?? null,
  };
}

// ── Recurring Expenses ──

export async function getRecurringExpenses(
  supabase: SupabaseClient
): Promise<ServiceResult<RecurringExpense[]>> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: 'Ausgaben konnten nicht geladen werden.' };
  return { data: data ?? [], error: null };
}

export async function createRecurringExpense(
  supabase: SupabaseClient, userId: string, input: RecurringExpenseInsert
): Promise<ServiceResult<RecurringExpense>> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: userId,
      name: sanitize(input.name, 200),
      amount: Number(input.amount),
      category: sanitize(input.category, 50) || 'Sonstiges',
    })
    .select()
    .single();
  if (error) return { data: null, error: 'Ausgabe konnte nicht gespeichert werden.' };
  return { data, error: null };
}

export async function deleteRecurringExpense(
  supabase: SupabaseClient, expenseId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', expenseId);
  if (error) return { data: null, error: 'Ausgabe konnte nicht gelöscht werden.' };
  return { data: null, error: null };
}

export async function getRecurringIncomes(
  supabase: SupabaseClient
): Promise<ServiceResult<RecurringIncome[]>> {
  const { data, error } = await supabase
    .from('recurring_incomes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: 'Einnahmen konnten nicht geladen werden.' };
  return { data: data ?? [], error: null };
}

export async function createRecurringIncome(
  supabase: SupabaseClient, userId: string, input: RecurringIncomeInsert
): Promise<ServiceResult<RecurringIncome>> {
  const { data, error } = await supabase
    .from('recurring_incomes')
    .insert({
      user_id: userId,
      name: sanitize(input.name, 200),
      amount: Number(input.amount),
      category: sanitize(input.category, 50) || 'Sonstiges',
    })
    .select()
    .single();
  if (error) return { data: null, error: 'Einnahme konnte nicht gespeichert werden.' };
  return { data, error: null };
}

export async function deleteRecurringIncome(
  supabase: SupabaseClient, incomeId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('recurring_incomes')
    .delete()
    .eq('id', incomeId);
  if (error) return { data: null, error: 'Einnahme konnte nicht gelöscht werden.' };
  return { data: null, error: null };
}
