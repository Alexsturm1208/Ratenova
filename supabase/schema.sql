-- ============================================================
-- SchuldenFrei — Supabase SQL Schema
-- Alle Tabellen, Indizes, RLS Policies, Trigger
-- ============================================================

-- ────────────────────────────
-- 1) PROFILES
-- ────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text default '',
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  premium_until timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Trigger: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: User can only read/update own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backwards compatibility: drop deprecated monthly_income column if it exists
alter table if exists public.profiles drop column if exists monthly_income;

-- ────────────────────────────
-- 2) DEBTS
-- ────────────────────────────
create table if not exists public.debts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  emoji            text not null default '📄',
  original_amount  numeric(12,2) not null check (original_amount >= 0),
  paid_amount      numeric(12,2) not null default 0 check (paid_amount >= 0),
  monthly_rate     numeric(12,2) not null default 0 check (monthly_rate >= 0),
  plan_status      text not null default 'open' check (plan_status in ('open','negotiation','rate')),
  due_date         date,
  notes            text default '',
  -- Creditor contact
  creditor_name    text default '',
  creditor_address text default '',
  creditor_phone   text default '',
  creditor_email   text default '',
  -- Bank details
  bank_name        text default '',
  bank_iban        text default '',
  bank_bic         text default '',
  bank_ref         text default '',
  created_at       timestamptz not null default now()
);

create index idx_debts_user_id on public.debts(user_id);
create index idx_debts_due_date on public.debts(user_id, due_date);

alter table public.debts enable row level security;

create policy "debts_select_own" on public.debts
  for select using (auth.uid() = user_id);
create policy "debts_insert_own" on public.debts
  for insert with check (auth.uid() = user_id);
create policy "debts_update_own" on public.debts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "debts_delete_own" on public.debts
  for delete using (auth.uid() = user_id);

-- ────────────────────────────
-- 3) PAYMENTS
-- ────────────────────────────
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  debt_id    uuid not null references public.debts(id) on delete cascade,
  date       date not null default current_date,
  amount     numeric(12,2) not null check (amount > 0),
  note       text default '',
  created_at timestamptz not null default now()
);

create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_debt_id on public.payments(debt_id);

alter table public.payments enable row level security;

create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);
create policy "payments_delete_own" on public.payments
  for delete using (auth.uid() = user_id);

-- ────────────────────────────
-- 4) AGREEMENTS
-- ────────────────────────────
create table if not exists public.agreements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  debt_id    uuid references public.debts(id) on delete set null,
  type       text not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index idx_agreements_user_id on public.agreements(user_id);

alter table public.agreements enable row level security;

create policy "agreements_select_own" on public.agreements
  for select using (auth.uid() = user_id);
create policy "agreements_insert_own" on public.agreements
  for insert with check (auth.uid() = user_id);
create policy "agreements_delete_own" on public.agreements
  for delete using (auth.uid() = user_id);

-- ────────────────────────────
-- 5) SERVER-SIDE FUNCTION: Enforce free limit (max 5 debts)
-- ────────────────────────────
create or replace function public.check_debt_limit()
returns trigger as $$
declare
  debt_count integer;
  user_plan text;
begin
  select plan into user_plan from public.profiles where id = new.user_id;

  if user_plan = 'free' then
    select count(*) into debt_count from public.debts where user_id = new.user_id;
    if debt_count >= 5 then
      raise exception 'FREE_LIMIT_REACHED: Kostenlose Accounts können maximal 5 Schulden anlegen.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_debt_limit on public.debts;
create trigger enforce_debt_limit
  before insert on public.debts
  for each row execute function public.check_debt_limit();

-- ────────────────────────────
-- 6) SERVER-SIDE FUNCTION: Auto-update paid_amount after payment insert
-- ────────────────────────────
create or replace function public.update_paid_amount()
returns trigger as $$
begin
  update public.debts
  set paid_amount = (
    select coalesce(sum(amount), 0) from public.payments where debt_id = new.debt_id
  )
  where id = new.debt_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_payment_insert on public.payments;
create trigger after_payment_insert
  after insert on public.payments
  for each row execute function public.update_paid_amount();

drop trigger if exists after_payment_delete on public.payments;
create trigger after_payment_delete
  after delete on public.payments
  for each row execute function public.update_paid_amount();

-- ────────────────────────────
-- 7) RECURRING_EXPENSES
-- ────────────────────────────
create table if not exists public.recurring_expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric(12,2) not null check (amount >= 0),
  category   text not null default 'Sonstiges',
  created_at timestamptz not null default now()
);

create index idx_expenses_user_id on public.recurring_expenses(user_id);

alter table public.recurring_expenses enable row level security;

create policy "expenses_select_own" on public.recurring_expenses
  for select using (auth.uid() = user_id);
create policy "expenses_insert_own" on public.recurring_expenses
  for insert with check (auth.uid() = user_id);
create policy "expenses_delete_own" on public.recurring_expenses
  for delete using (auth.uid() = user_id);

-- ────────────────────────────
-- 8) RECURRING_INCOMES
-- ────────────────────────────
create table if not exists public.recurring_incomes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric(12,2) not null check (amount >= 0),
  category   text not null default 'Sonstiges',
  created_at timestamptz not null default now()
);

create index idx_incomes_user_id on public.recurring_incomes(user_id);

alter table public.recurring_incomes enable row level security;

create policy "incomes_select_own" on public.recurring_incomes
  for select using (auth.uid() = user_id);
create policy "incomes_insert_own" on public.recurring_incomes
  for insert with check (auth.uid() = user_id);
create policy "incomes_delete_own" on public.recurring_incomes
  for delete using (auth.uid() = user_id);
