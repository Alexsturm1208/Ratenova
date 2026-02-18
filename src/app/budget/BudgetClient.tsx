 'use client';
 
 import { useState } from 'react';
 import type { RecurringExpense, DashboardTotals, Profile, RecurringIncome } from '@/types';
 import { createClient } from '@/lib/supabase-browser';
import { createRecurringExpense, deleteRecurringExpense, createRecurringIncome, deleteRecurringIncome } from '@/lib/services';
 import { useRouter } from 'next/navigation';
 
 interface Props {
   expenses: RecurringExpense[];
  incomes: RecurringIncome[];
   totals: DashboardTotals;
   profile: Profile;
   userId: string;
 }
 
export default function BudgetClient({ expenses, incomes, totals, profile, userId }: Props) {
   const supabase = createClient();
   const router = useRouter();
   const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [addingIncome, setAddingIncome] = useState(false);
   const [showGroups, setShowGroups] = useState(true);
 
   const fmt = (n: number) =>
     new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';
 
   const monthlyDebt = totals.monthlyTotal;
   const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyIncomes = incomes.reduce((s, i) => s + i.amount, 0);
  const income = monthlyIncomes;
  const net = income - monthlyDebt - monthlyExpenses;
   const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
     const key = (e.category || 'Sonstiges').trim() || 'Sonstiges';
     acc[key] = (acc[key] || 0) + e.amount;
     return acc;
   }, {});
   const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
  const byIncomeCategory = incomes.reduce<Record<string, number>>((acc, e) => {
    const key = (e.category || 'Sonstiges').trim() || 'Sonstiges';
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {});
  const sortedIncomes = [...incomes].sort((a, b) => b.amount - a.amount);
 
   async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
     e.preventDefault();
     setError('');
     setAdding(true);
     const fd = new FormData(e.currentTarget);
     const input = {
       name: fd.get('name') as string,
       amount: Number(fd.get('amount')),
       category: (fd.get('category') as string) || undefined,
     };
     const res = await createRecurringExpense(supabase as any, userId, input);
     if (res.error) {
       setError(res.error);
       setAdding(false);
       return;
     }
     setAdding(false);
     (e.target as HTMLFormElement).reset();
     router.refresh();
   }
 
   async function handleDelete(id: string) {
     setError('');
     const res = await deleteRecurringExpense(supabase as any, id);
     if (res.error) {
       setError(res.error);
       return;
     }
     router.refresh();
   }
 
  async function handleAddIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setAddingIncome(true);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: fd.get('name') as string,
      amount: Number(fd.get('amount')),
      category: (fd.get('category') as string) || undefined,
    };
    const res = await createRecurringIncome(supabase as any, userId, input);
    if (res.error) {
      setError(res.error);
      setAddingIncome(false);
      return;
    }
    setAddingIncome(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleDeleteIncome(id: string) {
    setError('');
    const res = await deleteRecurringIncome(supabase as any, id);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

   function handlePrintStatement() {
     const now = new Date().toLocaleString('de-DE');
     const incomeVal = income;
     const debtVal = monthlyDebt;
     const expVal = monthlyExpenses;
     const netVal = net;
     const rows = sortedExpenses.map(e => {
       return `<tr>
         <td style="padding:10px 12px;border-bottom:1px solid #eee;">${e.name}</td>
         <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(e.amount)}</td>
         <td style="padding:10px 12px;border-bottom:1px solid #eee;">${e.category || 'Sonstiges'}</td>
       </tr>`;
     }).join('');
     const catRows = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat, sum]) => {
       return `<tr>
         <td style="padding:8px 10px;border-bottom:1px solid #eee;">${cat}</td>
         <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(sum)}</td>
       </tr>`;
     }).join('');
     const incRows = sortedIncomes.map(e => {
       return `<tr>
         <td style="padding:10px 12px;border-bottom:1px solid #eee;">${e.name}</td>
         <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(e.amount)}</td>
         <td style="padding:10px 12px;border-bottom:1px solid #eee;">${e.category || 'Sonstiges'}</td>
       </tr>`;
     }).join('');
     const incCatRows = Object.entries(byIncomeCategory).sort((a,b)=>b[1]-a[1]).map(([cat, sum]) => {
       return `<tr>
         <td style="padding:8px 10px;border-bottom:1px solid #eee;">${cat}</td>
         <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(sum)}</td>
       </tr>`;
     }).join('');
     const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ein-/Ausgabenrechnung</title>
       <style>
         :root{--primary:#1e88e5;--text:#1a1a1a;--muted:#666}
         body{font-family:Inter,Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif;color:var(--text);max-width:900px;margin:40px auto;padding:0 20px}
         h1{font-size:22px;margin:0 0 6px}
         h2{font-size:16px;margin:20px 0 8px}
         .sub{color:var(--muted);font-size:12px;margin-bottom:16px}
         table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden}
         thead th{background:#f7f7f9;color:#333;font-size:12px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:10px 12px;border-bottom:1px solid #e6e6eb}
         tfoot td{background:#fafafa;font-weight:600}
         .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}
         .card{border:1px solid #eee;border-radius:12px;padding:12px;background:#fff}
         .label{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.04em}
         .value{font-size:18px;font-weight:800;color:var(--primary)}
         .section{margin:18px 0}
         @media print{body{margin:0;padding:12px}}
       </style></head><body>
         <h1>Ein-/Ausgabenrechnung</h1>
         <div class="sub">Erstellt am ${now} · ${profile.name || ''}</div>
         <div class="grid">
           <div class="card"><div class="label">Einkommen/Monat</div><div class="value">${fmt(incomeVal)}</div></div>
           <div class="card"><div class="label">Ausgaben/Monat</div><div class="value">${fmt(expVal)}</div></div>
           <div class="card"><div class="label">Raten/Monat</div><div class="value">${fmt(debtVal)}</div></div>
           <div class="card"><div class="label">${netVal >= 0 ? 'Überschuss' : 'Defizit'}</div><div class="value">${fmt(Math.abs(netVal))}</div></div>
         </div>
         <div class="section">
           <h2>Einnahmen</h2>
          <table>
            <thead><tr><th>Bezeichnung</th><th style="text-align:right">Betrag</th><th>Kategorie</th></tr></thead>
            <tbody>${incRows}</tbody>
            <tfoot><tr><td style="padding:12px">Summe</td><td style="padding:12px;text-align:right">${fmt(incomeVal)}</td><td></td></tr></tfoot>
          </table>
           <h2>Einnahmen nach Kategorien</h2>
           <table>
             <thead><tr><th>Kategorie</th><th style="text-align:right">Summe</th></tr></thead>
             <tbody>${incCatRows}</tbody>
           </table>
         </div>
         <div class="section">
           <h2>Ausgaben</h2>
           <table>
             <thead><tr><th>Bezeichnung</th><th style="text-align:right">Betrag</th><th>Kategorie</th></tr></thead>
             <tbody>${rows}</tbody>
             <tfoot><tr><td style="padding:12px">Summe</td><td style="padding:12px;text-align:right">${fmt(expVal)}</td><td></td></tr></tfoot>
           </table>
         </div>
         <div class="section">
           <h2>Ausgaben nach Kategorien</h2>
           <table>
             <thead><tr><th>Kategorie</th><th style="text-align:right">Summe</th></tr></thead>
             <tbody>${catRows}</tbody>
           </table>
         </div>
         <div class="section">
           <h2>Schulden – Raten/Monat</h2>
           <table>
             <thead><tr><th>Position</th><th style="text-align:right">Betrag</th></tr></thead>
             <tbody>
               <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;">Raten gesamt</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(debtVal)}</td></tr>
             </tbody>
           </table>
         </div>
         <div class="section">
           <h2>Ergebnis</h2>
           <table>
             <thead><tr><th>Berechnung</th><th style="text-align:right">Betrag</th></tr></thead>
             <tbody>
               <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;">Einkommen − Ausgaben − Raten</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(netVal)}</td></tr>
             </tbody>
           </table>
         </div>
       </body></html>`;
     const w = window.open('', '_blank');
     if (!w) return;
     w.document.write(html);
     w.document.close();
     setTimeout(() => w.print(), 300);
   }

   return (
     <div>
       <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
         <h1 className="text-2xl font-extrabold">Budget</h1>
         <div className="flex gap-2">
           <button
             onClick={() => setShowGroups(v => !v)}
             className="px-4 py-2.5 rounded-xl text-sm font-semibold border text-sf-ts border-white/10 bg-transparent hover:bg-white/5 transition"
           >
             {showGroups ? 'Gruppierung aus' : 'Gruppierung an'}
           </button>
           <button
             onClick={handlePrintStatement}
             className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition"
           >
             🖨️ Ein-/Ausgabenrechnung
           </button>
         </div>
       </div>
 
       <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mb-5">
         <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
           <p className="text-[11px] text-sf-tm uppercase tracking-wide">Monatseinkommen</p>
           <p className="text-[20px] font-bold">{fmt(income)}</p>
           <p className="text-[12px] text-sf-tm mt-1">Summe der Einnahmen/Monat</p>
         </div>
         <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
           <p className="text-[11px] text-sf-tm uppercase tracking-wide">Fixkosten (Ausgaben)</p>
           <p className="text-[20px] font-bold">{fmt(monthlyExpenses)}</p>
         </div>
         <div className="bg-sf-bg-c rounded-2xl p-4 border border-white/5">
           <p className="text-[11px] text-sf-tm uppercase tracking-wide">Raten/Monat (Schulden)</p>
           <p className="text-[20px] font-bold">{fmt(monthlyDebt)}</p>
         </div>
         <div className={`rounded-2xl p-4 border ${net >= 0 ? 'border-sf-em/30 bg-sf-em/10' : 'border-sf-co/30 bg-sf-co/10'}`}>
           <p className="text-[11px] text-sf-tm uppercase tracking-wide">Ergebnis</p>
           <p className="text-[20px] font-bold">{net >= 0 ? `Überschuss ${fmt(net)}` : `Defizit ${fmt(Math.abs(net))}`}</p>
         </div>
       </div>
 
       <div className="rounded-3xl p-6 border border-white/10 mb-6 bg-sf-bg-c">
         <p className="text-sm font-semibold">Berechnung: Einkommen − Ausgaben − Raten</p>
         <p className="text-[13px] text-sf-tm">Zeigt deinen monatlichen Überschuss oder Fehlbetrag.</p>
       </div>
 
       {error && <div className="bg-sf-co/10 border border-sf-co/20 rounded-xl px-4 py-3 text-sm text-sf-co mb-4">{error}</div>}
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-sf-bg-c rounded-3xl p-6 border border-white/10">
           <h3 className="text-[15px] font-bold mb-3">Monatliche Ausgaben</h3>
           <form onSubmit={handleAddExpense} className="space-y-3 mb-4">
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-xs font-semibold text-sf-ts mb-1">Bezeichnung *</label>
                 <input name="name" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="z.B. Miete, Spotify" />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-sf-ts mb-1">Betrag/Monat * (€)</label>
                 <input name="amount" type="number" step="0.01" min="0" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-semibold text-sf-ts mb-1">Kategorie</label>
               <input name="category" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="z.B. Miete, Abo, Versicherungen" />
             </div>
             <div className="flex gap-3 pt-1">
               <button type="submit" disabled={adding}
                 className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition disabled:opacity-50">
                 {adding ? 'Hinzufügen...' : 'Hinzufügen'}
               </button>
             </div>
           </form>
 
           <div className="space-y-2">
             {(showGroups ? sortedExpenses : expenses).map(e => (
               <div key={e.id} className="flex items-center justify-between bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3">
                 <div>
                   <p className="text-sm font-semibold">{e.name}</p>
                   <p className="text-[12px] text-sf-tm">{e.category}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <p className="text-sm font-bold">{fmt(e.amount)}</p>
                   <button onClick={() => handleDelete(e.id)} className="w-8 h-8 rounded-lg border border-white/10 bg-transparent text-sf-tm hover:text-sf-co hover:border-sf-co/30 transition">✕</button>
                 </div>
               </div>
             ))}
             {expenses.length === 0 && (
               <div className="text-center py-12">
                 <p className="text-4xl mb-2">🧾</p>
                 <p className="font-semibold">Noch keine Ausgaben erfasst.</p>
               </div>
             )}
             {showGroups && Object.keys(byCategory).length > 0 && (
               <div className="mt-4">
                 <p className="text-[12px] text-sf-tm mb-2">Nach Kategorien</p>
                 <div className="space-y-1">
                   {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,sum]) => (
                     <div key={cat} className="flex justify-between bg-sf-bg-e border border-white/5 rounded-xl px-4 py-2">
                       <span className="text-sm">{cat}</span>
                       <span className="text-sm font-bold">{fmt(sum)}</span>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </div>
         <div className="bg-sf-bg-c rounded-3xl p-6 border border-white/10">
           <h3 className="text-[15px] font-bold mb-3">Monatliche Einnahmen</h3>
           <form onSubmit={handleAddIncome} className="space-y-3 mb-4">
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-xs font-semibold text-sf-ts mb-1">Bezeichnung *</label>
                 <input name="name" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="z.B. Gehalt, Nebenjob, Miete" />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-sf-ts mb-1">Betrag/Monat * (€)</label>
                 <input name="amount" type="number" step="0.01" min="0" required className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-semibold text-sf-ts mb-1">Kategorie</label>
               <input name="category" className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition" placeholder="z.B. Gehalt, Nebenjob, Vermietung" />
             </div>
             <div className="flex gap-3 pt-1">
               <button type="submit" disabled={addingIncome}
                 className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition disabled:opacity-50">
                 {addingIncome ? 'Hinzufügen...' : 'Hinzufügen'}
               </button>
             </div>
           </form>
 
           <div className="space-y-2">
             {(showGroups ? sortedIncomes : incomes).map(e => (
               <div key={e.id} className="flex items-center justify-between bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3">
                 <div>
                   <p className="text-sm font-semibold">{e.name}</p>
                   <p className="text-[12px] text-sf-tm">{e.category}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <p className="text-sm font-bold">{fmt(e.amount)}</p>
                   <button onClick={() => handleDeleteIncome(e.id)} className="w-8 h-8 rounded-lg border border-white/10 bg-transparent text-sf-tm hover:text-sf-co hover:border-sf-co/30 transition">✕</button>
                 </div>
               </div>
             ))}
             {incomes.length === 0 && (
               <div className="text-center py-12">
                 <p className="text-4xl mb-2">💶</p>
                 <p className="font-semibold">Noch keine zusätzlichen Einnahmen erfasst.</p>
               </div>
             )}
             {showGroups && Object.keys(byIncomeCategory).length > 0 && (
               <div className="mt-4">
                 <p className="text-[12px] text-sf-tm mb-2">Nach Kategorien</p>
                 <div className="space-y-1">
                   {Object.entries(byIncomeCategory).sort((a,b)=>b[1]-a[1]).map(([cat,sum]) => (
                     <div key={cat} className="flex justify-between bg-sf-bg-e border border-white/5 rounded-xl px-4 py-2">
                       <span className="text-sm">{cat}</span>
                       <span className="text-sm font-bold">{fmt(sum)}</span>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 }
