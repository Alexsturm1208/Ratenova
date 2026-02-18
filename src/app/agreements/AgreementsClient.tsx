'use client';

import { useState } from 'react';
import type { Debt } from '@/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €';

const fmtDateLong = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
};

const templates = [
  { id: 'ratenzahlung', name: 'Ratenzahlungsvereinbarung', icon: '📋', desc: 'Klassische Vereinbarung über Ratenzahlung einer offenen Forderung', tags: ['Standard', 'Raten'] },
  { id: 'vergleich', name: 'Vergleichsvereinbarung', icon: '🤝', desc: 'Einigung auf einen reduzierten Betrag zur sofortigen Tilgung', tags: ['Rabatt', 'Einigung'] },
  { id: 'stundung', name: 'Stundungsvereinbarung', icon: '⏸️', desc: 'Vorübergehende Aussetzung der Zahlungspflicht', tags: ['Pause', 'Aufschub'] },
  { id: 'teilzahlung', name: 'Teilzahlungsangebot', icon: '✂️', desc: 'Einmalige Teilzahlung zur vollständigen Erledigung', tags: ['Einmalzahlung'] },
  { id: 'mahnung_antwort', name: 'Antwort auf Mahnung', icon: '📬', desc: 'Höfliche Antwort auf eine Mahnung mit Zahlungsvorschlag', tags: ['Mahnung'] },
  { id: 'haertefall', name: 'Härtefallantrag', icon: '🛡️', desc: 'Antrag auf besondere Berücksichtigung bei finanzieller Notlage', tags: ['Notlage'] },
];

interface FormData {
  name: string; street: string; zip: string; city: string;
  creditor: string; creditorStreet: string; creditorZip: string; creditorCity: string;
  amount: string; rate: string; startDate: string; reason: string;
  offerAmount: string; pauseUntil: string;
}

const emptyForm: FormData = {
  name: '', street: '', zip: '', city: '',
  creditor: '', creditorStreet: '', creditorZip: '', creditorCity: '',
  amount: '', rate: '', startDate: '', reason: '', offerAmount: '', pauseUntil: '',
};

type FieldProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string };
function Field({ label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-sf-ts mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-sf-bg-e border border-white/5 rounded-xl px-4 py-3 text-sf-t text-sm focus:border-sf-em/30 focus:ring-2 focus:ring-sf-em/15 transition"
      />
    </div>
  );
}

function generateLetter(templateId: string, d: FormData) {
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const amt = parseFloat(d.amount) || 0;
  const rate = parseFloat(d.rate) || 0;
  const offer = parseFloat(d.offerAmount) || 0;
  const months = rate > 0 ? Math.ceil(amt / rate) : 0;

  let betreff = '', body = '', closing = '';

  if (templateId === 'ratenzahlung') {
    betreff = `Vorschlag zur Ratenzahlung – Offene Forderung ${fmt(amt)}`;
    body = `ich möchte die offene Forderung in Höhe von ${fmt(amt)} transparent und verlässlich begleichen. Mein Vorschlag:

• Monatliche Rate: ${fmt(rate)}
• Laufzeit: ca. ${months} Monate
• Beginn: ${d.startDate ? fmtDateLong(d.startDate) : 'zum nächstmöglichen Zeitpunkt'}
${d.reason ? `• Hintergrund: ${d.reason}\n` : ''}

Die Zahlung erfolgt jeweils zum 1. eines Monats.`;
    closing = 'Bitte bestätigen Sie die Vereinbarung kurz. Vielen Dank.';
  } else if (templateId === 'vergleich') {
    const pct = amt > 0 ? Math.round(offer / amt * 100) : 0;
    betreff = `Vergleich zur Erledigung – Offene Forderung ${fmt(amt)}`;
    body = `zur schnellen und fairen Erledigung biete ich Ihnen folgenden Vergleich an:

• Angebot: ${fmt(offer)} (${pct}% der Forderung)
• Zahlungsfrist: innerhalb von 14 Tagen nach Annahme
${d.reason ? `• Hintergrund: ${d.reason}\n` : ''}

Im Gegenzug bitte ich um Erledigung der Restforderung.`;
    closing = 'Ich freue mich über Ihre kurze Bestätigung.';
  } else if (templateId === 'stundung') {
    betreff = `Befristete Stundung – Offene Forderung ${fmt(amt)}`;
    body = `ich bitte um eine befristete Stundung.

• Bis: ${d.pauseUntil ? fmtDateLong(d.pauseUntil) : '[Datum]'}
• Danach: Wiederaufnahme der Zahlungen${rate > 0 ? ` mit ${fmt(rate)}/Monat` : ''}
${d.reason ? `• Hintergrund: ${d.reason}\n` : ''}
`;
    closing = 'Vielen Dank für Ihre Kulanz und kurze Rückmeldung.';
  } else if (templateId === 'teilzahlung') {
    betreff = `Einmalige Teilzahlung – Offene Forderung ${fmt(amt)}`;
    body = `ich biete eine einmalige Zahlung zur Erledigung an:

• Einmalzahlung: ${fmt(offer)}
• Frist: innerhalb von 7 Tagen nach Annahme

Bitte akzeptieren Sie die Zahlung als vollständige Erledigung.`;
    closing = 'Ich freue mich über Ihre Bestätigung.';
  } else if (templateId === 'mahnung_antwort') {
    betreff = `Antwort auf Ihre Mahnung – Forderung ${fmt(amt)}`;
    body = `danke für Ihre Erinnerung. Ich schlage folgenden Zahlungsplan vor:

• Rate: ${fmt(rate)}
• Laufzeit: ca. ${months} Monate
• Start: ${d.startDate ? fmtDateLong(d.startDate) : 'sofort'}
${d.reason ? `• Hinweis: ${d.reason}\n` : ''}

Ich bitte um Aussetzung weiterer Gebühren während des Plans.`;
    closing = 'Bitte geben Sie mir kurz Rückmeldung.';
  } else if (templateId === 'haertefall') {
    betreff = `Härtefallantrag – Offene Forderung ${fmt(amt)}`;
    body = `ich beantrage eine Berücksichtigung als Härtefall.

• Situation: ${d.reason || 'aktuelle finanzielle Notlage'}
• Zahlungsfähigkeit: ${rate > 0 ? `max. ${fmt(rate)}/Monat` : 'derzeit keine regelmäßigen Zahlungen möglich'}

Ich bitte um Reduzierung/Anpassung der Forderung und Aussetzung von Gebühren.`;
    closing = 'Gern reiche ich Nachweise nach. Vielen Dank.';
  }

  return { betreff, body, closing, today };
}

interface Props { debts: Debt[]; userPlan: string; }

export default function AgreementsClient({ debts, userPlan }: Props) {
  const [step, setStep] = useState(1);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });

  const activeDebts = debts.filter(d => d.paid_amount < d.original_amount);
  const selectedDebt = debts.find(d => d.id === selectedDebtId);
  const template = templates.find(t => t.id === selectedTemplate);

  function selectDebt(debt: Debt) {
    setSelectedDebtId(debt.id);
    // Auto-fill from debt data
    const addr = debt.creditor_address || '';
    const parts = addr.split(',').map(s => s.trim());
    let cStreet = addr, cZip = '', cCity = '';
    if (parts.length >= 2) {
      cStreet = parts[0];
      const m = parts[1].match(/^(\d{5})\s+(.+)/);
      if (m) { cZip = m[1]; cCity = m[2]; } else { cCity = parts[1]; }
    }
    setForm(f => ({
      ...f,
      creditor: debt.creditor_name || debt.name,
      creditorStreet: cStreet,
      creditorZip: cZip,
      creditorCity: cCity,
      amount: String(debt.original_amount - debt.paid_amount),
      rate: String(debt.monthly_rate),
    }));
  }

  function handleGenerate() {
    if (!form.name || !form.creditor || !form.amount) return;
    setStep(3);
  }

  function reset() {
    setStep(1);
    setSelectedDebtId(null);
    setSelectedTemplate(null);
    setForm({ ...emptyForm });
  }

  const updateField = (key: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

 

  // ── STEP 3: Preview ──
  if (step === 3 && selectedTemplate) {
    const doc = generateLetter(selectedTemplate, form);
    const plainText = `${form.name}\n${form.street}\n${form.zip} ${form.city}\n\n${doc.today}\n\n${form.creditor}\n${form.creditorStreet}\n${form.creditorZip} ${form.creditorCity}\n\nBetreff: ${doc.betreff}\n\nSehr geehrte Damen und Herren,\n\n${doc.body}\n\n${doc.closing}\n\nMit freundlichen Grüßen\n${form.name}`;

    const handleCopy = () => navigator.clipboard.writeText(plainText);
    const handlePrint = () => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.betreff}</title>
        <style>
          @page { size: A4; margin: 20mm 18mm; }
          body{font-family:Inter,Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:12pt;line-height:1.75;color:#1a1a1a}
          .header{display:flex;justify-content:flex-end;align-items:center;margin-top:10mm;margin-bottom:6mm;color:#555}
          .sender{font-size:10pt;color:#555;margin-top:6mm}
          .address{margin-top:45mm;margin-bottom:10mm}
          .subject{font-weight:700;margin:0 0 18px}
          pre{white-space:pre-wrap;font-family:inherit;margin:0 0 18px}
          .fold{position:fixed;left:3mm;width:15mm;height:0;border-top:0.3mm solid #bbb}
          .f1{top:105mm}
          .f2{top:210mm}
          .footer{margin-top:28px}
          .sign{margin-top:40px;font-weight:600}
          @media print{}
        </style></head><body>
        <div class="fold f1"></div><div class="fold f2"></div>
        <div class="header"><div>${doc.today}</div></div>
        <div class="sender">${form.name}<br>${form.street}<br>${form.zip} ${form.city}</div>
        <div class="address"><strong>${form.creditor}</strong><br>${form.creditorStreet}<br>${form.creditorZip} ${form.creditorCity}</div>
        <p class="subject">Betreff: ${doc.betreff}</p>
        <p>Sehr geehrte Damen und Herren,</p>
        <pre>${doc.body}</pre>
        <p>${doc.closing}</p>
        <p class="footer">Mit freundlichen Grüßen</p>
        <p class="sign">${form.name}</p>
        </body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 300);
    };

    return (
      <div>
        <button onClick={() => setStep(2)} className="text-sm text-sf-tm hover:text-sf-ts mb-6 block">← Zurück zur Bearbeitung</button>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">{template?.icon}</span>
          <div>
            <h2 className="text-xl font-extrabold">{template?.name}</h2>
            <p className="text-sm text-sf-tm">Vorschau — prüfe den Text und kopiere oder drucke ihn</p>
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl p-1 mb-5 bg-sf-bg-e">
          <div className="bg-white text-gray-900 rounded-xl p-8 font-serif text-sm leading-relaxed">
            <div className="flex justify-between mb-8">
              <div><strong>{form.name || '[Name]'}</strong><br />{form.street || '[Straße]'}<br />{form.zip || '[PLZ]'} {form.city || '[Ort]'}</div>
              <div className="text-right text-gray-500">{doc.today}</div>
            </div>
            <div className="mb-6"><strong>{form.creditor || '[Gläubiger]'}</strong><br />{form.creditorStreet || '[Straße]'}<br />{form.creditorZip || '[PLZ]'} {form.creditorCity || '[Ort]'}</div>
            <p className="font-bold mb-5">Betreff: {doc.betreff}</p>
            <p className="mb-4">Sehr geehrte Damen und Herren,</p>
            <div className="whitespace-pre-wrap mb-4">{doc.body}</div>
            <p className="mb-6">{doc.closing}</p>
            <p className="mb-2">Mit freundlichen Grüßen</p>
            <p className="font-semibold">{form.name || '[Unterschrift]'}</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-sf-ts hover:bg-white/5 transition">✏️ Bearbeiten</button>
          <button onClick={handleCopy} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sf-em/15 text-sf-em border border-sf-em/30 hover:bg-sf-em/25 transition">📋 Text kopieren</button>
          <button onClick={handlePrint} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition">🖨️ Drucken / PDF</button>
          <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-sf-ts hover:bg-white/5 transition">🔄 Neue Vereinbarung</button>
        </div>
      </div>
    );
  }

  // ── STEP 2: Form ──
  if (step === 2 && template) {
    const showRate = ['ratenzahlung', 'mahnung_antwort'].includes(template.id);
    const showOffer = ['vergleich', 'teilzahlung'].includes(template.id);
    const showPause = template.id === 'stundung';
    const showReason = ['stundung', 'haertefall', 'mahnung_antwort'].includes(template.id);

    return (
      <div>
        <button onClick={() => setStep(1)} className="text-sm text-sf-tm hover:text-sf-ts mb-6 block">← Zurück zur Vorlagenauswahl</button>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{template.icon}</span>
          <div>
            <h2 className="text-xl font-extrabold">{template.name}</h2>
            <p className="text-sm text-sf-tm">{template.desc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-sf-bg-c rounded-2xl border border-white/5 p-5 space-y-3">
            <h3 className="text-[15px] font-bold mb-3">📍 Deine Angaben</h3>
            <Field label="Vollständiger Name" value={form.name} onChange={v => updateField('name', v)} placeholder="Max Mustermann" />
            <Field label="Straße und Hausnummer" value={form.street} onChange={v => updateField('street', v)} placeholder="Musterstraße 1" />
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <Field label="PLZ" value={form.zip} onChange={v => updateField('zip', v)} placeholder="12345" />
              <Field label="Ort" value={form.city} onChange={v => updateField('city', v)} placeholder="Berlin" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-sf-bg-c rounded-2xl border border-white/5 p-5 space-y-3">
              <h3 className="text-[15px] font-bold mb-3">🏢 Gläubiger</h3>
              <Field label="Name des Gläubigers" value={form.creditor} onChange={v => updateField('creditor', v)} placeholder="Firma / Person" />
              <Field label="Straße und Hausnummer" value={form.creditorStreet} onChange={v => updateField('creditorStreet', v)} placeholder="Leopoldstr. 88" />
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <Field label="PLZ" value={form.creditorZip} onChange={v => updateField('creditorZip', v)} placeholder="80802" />
                <Field label="Ort" value={form.creditorCity} onChange={v => updateField('creditorCity', v)} placeholder="München" />
              </div>
            </div>
            <div className="bg-sf-bg-c rounded-2xl border border-white/5 p-5 space-y-3">
              <h3 className="text-[15px] font-bold mb-3">💰 Zahlungsdetails</h3>
              <Field label="Offener Gesamtbetrag (€)" value={form.amount} onChange={v => updateField('amount', v)} type="number" placeholder="0" />
              {showRate && <>
                <Field label="Vorgeschlagene Monatsrate (€)" value={form.rate} onChange={v => updateField('rate', v)} type="number" placeholder="0" />
                <Field label="Beginn der Ratenzahlung" value={form.startDate} onChange={v => updateField('startDate', v)} type="date" />
              </>}
              {showOffer && <>
                <Field label="Angebotener Betrag (€)" value={form.offerAmount} onChange={v => updateField('offerAmount', v)} type="number" placeholder="0" />
                <p className="text-xs text-sf-am">💡 Tipp: 60–80% der Forderung sind oft verhandelbar</p>
              </>}
              {showPause && <Field label="Stundung bis (Datum)" value={form.pauseUntil} onChange={v => updateField('pauseUntil', v)} type="date" />}
              {showReason && <Field label="Begründung" value={form.reason} onChange={v => updateField('reason', v)} placeholder="z.B. Arbeitslosigkeit, Krankheit..." />}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl text-sm font-semibold border border-white/10 text-sf-ts hover:bg-white/5 transition">Zurück</button>
          <button onClick={handleGenerate} className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition">✨ Vereinbarung generieren</button>
        </div>
      </div>
    );
  }

  // ── STEP 1: Template Selection ──
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1.5">Zahlungsvereinbarung</h1>
      <p className="text-sm text-sf-tm mb-7">Erstelle professionelle Schreiben an deine Gläubiger. Wähle eine Vorlage und fülle die Daten aus.</p>

      {activeDebts.length > 0 && (
        <div className="mb-6">
          <label className="block text-xs font-semibold text-sf-ts mb-2.5 uppercase tracking-wider">1. Für welche Schuld?</label>
          <div className="flex gap-2 flex-wrap">
            {activeDebts.map(d => (
              <button key={d.id} onClick={() => selectDebt(d)}
                className={`bg-sf-bg-c rounded-2xl px-4 py-3 border transition text-left
                  ${selectedDebtId === d.id ? 'border-sf-em/30 bg-sf-em/[0.08]' : 'border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{d.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-sf-tm">{fmt(d.original_amount - d.paid_amount)} offen</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-xs font-semibold text-sf-ts mb-2.5 uppercase tracking-wider">2. Vorlage wählen</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {templates.map(t => (
          <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
            className={`bg-sf-bg-c rounded-2xl p-4 border text-left transition
              ${selectedTemplate === t.id ? 'border-sf-em/30 bg-sf-em/[0.08]' : 'border-white/5 hover:border-white/10 hover:bg-sf-bg-h'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className="text-sm font-bold mb-1">{t.name}</p>
                <p className="text-xs text-sf-tm mb-2 leading-relaxed">{t.desc}</p>
                <div className="flex gap-1">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-sf-bg-e text-sf-ts font-semibold">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedDebtId && selectedTemplate && (
        <div className="text-right">
          <button onClick={() => setStep(2)}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sf-em-d to-sf-em shadow-lg shadow-sf-em/25 hover:brightness-110 transition">
            Weiter → Daten eingeben
          </button>
        </div>
      )}
    </div>
  );
}
