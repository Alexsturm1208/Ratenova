# 🕊️ SchuldenFrei — Produktionsreife SaaS-Anwendung

Schulden-Management für Privatpersonen mit Multi-User, Supabase Backend, Admin Panel und Free/Premium Modell.

---

## 📐 Architektur-Übersicht

```
┌──────────────────────────────────────────────────────────────┐
│                       FRONTEND                                │
│  Next.js 15 (App Router) + React 19 + TypeScript + Tailwind  │
│                                                                │
│  /auth/*          → Login, Register, Forgot Password          │
│  /dashboard       → Übersicht (SSR + Client Hydration)        │
│  /debts/*         → CRUD Schulden + Detail                    │
│  /agreements      → Vereinbarungs-Generator (6 Vorlagen)      │
│  /timeline        → Verlauf & Statistiken                     │
│  /admin/*         → Support-Panel (eigene Auth)               │
├──────────────────────────────────────────────────────────────┤
│                    MIDDLEWARE (src/middleware.ts)               │
│  Route Protection: Prüft Supabase Session für geschützte      │
│  Routen. Leitet zu /auth/login um wenn nicht eingeloggt.      │
├──────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER (src/lib/)                    │
│  services.ts     → Alle DB-Operationen (CRUD)                │
│  validation.ts   → Server-side Input Validation               │
│  admin-auth.ts   → Admin JWT Session Management               │
├──────────────────────────────────────────────────────────────┤
│                    API ROUTES (src/app/api/)                   │
│  /api/admin/login    → Admin-Login (JWT Cookie)               │
│  /api/admin/search   → Kundensuche (Service Role)             │
│  /api/admin/customer → Kundenakte laden (Service Role)        │
│  /api/admin/actions  → Plan ändern, Export (Service Role)     │
├──────────────────────────────────────────────────────────────┤
│                    SUPABASE                                    │
│  Auth         → E-Mail + Passwort, Session via Cookies        │
│  PostgreSQL   → profiles, debts, payments, agreements         │
│  RLS          → Jede Zeile nur für auth.uid() = user_id       │
│  Triggers     → Auto-Profile, Free-Limit (5), paid_amount    │
│  Service Role → NUR serverseitig für Admin-Endpoints          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔒 Sicherheitskonzept

### 1. Datentrennung (Row Level Security)
- **Jede Tabelle** hat RLS aktiviert
- Policies: `auth.uid() = user_id` für SELECT, INSERT, UPDATE, DELETE
- Kein Nutzer kann fremde Daten sehen oder ändern
- Admin-Zugriff läuft NICHT über RLS, sondern über Service Role Key (serverseitig)

### 2. Free-Limit Enforcement
- **Datenbank-Trigger** (`check_debt_limit`) prüft VOR jedem INSERT:
  - Plan = 'free' UND bereits >= 5 Schulden → `RAISE EXCEPTION`
- Der Client zeigt den Upgrade-Hinweis, aber der Server blockt unabhängig davon
- **Never trust the client** — selbst bei manipuliertem Frontend greift die DB-Sperre

### 3. Admin-Sicherheit
- Admin-Login ist KOMPLETT getrennt von Supabase Auth
- JWT-Token in httpOnly Cookie (nicht per JavaScript lesbar)
- Jeder Admin-API-Endpoint prüft `verifyAdminSession()` als Erstes
- Service Role Key liegt nur in ENV, niemals im Frontend
- DEV: `master/master` erlaubt | PROD: Nur ENV-Credentials, master/master explizit geblockt

### 4. Input Validation
- `validation.ts` prüft: Typ, Länge, Format, Wertebereich
- `sanitize()` trimmt und begrenzt String-Felder
- Fehlermeldungen enthalten keine technischen Details

### 5. DSGVO-Grundprinzipien
- Datenminimierung: nur notwendige Felder
- Löschbarkeit: CASCADE auf alle Tabellen bei User-Delete
- Exportierbarkeit: Admin-Panel bietet JSON-Export der kompletten Kundenakte
- Keine Tracking-Cookies oder Analytics (kann später ergänzt werden)

---

## 📁 Projektstruktur

```
schuldenfrei/
├── .env.example                  # Umgebungsvariablen Vorlage
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── supabase/
│   └── schema.sql                # Komplettes DB Schema + RLS + Triggers
├── src/
│   ├── middleware.ts              # Route Protection
│   ├── types/
│   │   └── index.ts              # Alle TypeScript Interfaces
│   ├── lib/
│   │   ├── supabase-browser.ts   # Client-side Supabase (anon key + RLS)
│   │   ├── supabase-server.ts    # SSR Supabase (anon key + cookies)
│   │   ├── supabase-admin.ts     # Admin Supabase (service role, NEVER in client)
│   │   ├── services.ts           # Service Layer: alle CRUD Operationen
│   │   ├── validation.ts         # Input Validation
│   │   └── admin-auth.ts         # Admin JWT Auth
│   ├── components/
│   │   ├── AppShell.tsx           # Sidebar + Mobile Nav + Logout
│   │   ├── ProgressRing.tsx       # Animierter SVG Ring
│   │   └── DebtCard.tsx           # Schulden-Karte (wiederverwendbar)
│   └── app/
│       ├── globals.css            # Tailwind + SchuldenFrei Dark Theme
│       ├── layout.tsx             # Root Layout
│       ├── page.tsx               # Redirect → Dashboard oder Login
│       ├── auth/
│       │   ├── login/page.tsx     # Anmeldeseite
│       │   ├── register/page.tsx  # Registrierung
│       │   └── forgot/page.tsx    # Passwort vergessen
│       ├── dashboard/
│       │   ├── layout.tsx         # App Shell (Sidebar, Auth-Check)
│       │   ├── page.tsx           # Server Component (Daten laden)
│       │   └── DashboardClient.tsx # Client Component (UI Rendering)
│       ├── debts/                 # (TODO: Schulden-Seiten)
│       ├── agreements/            # (TODO: Vereinbarungs-Generator)
│       ├── timeline/              # (TODO: Verlauf)
│       ├── admin/
│       │   ├── login/page.tsx     # Admin Login
│       │   ├── panel/page.tsx     # Kundensuche + Liste
│       │   └── customers/[id]/page.tsx  # Kundenakte mit Tabs
│       └── api/admin/
│           ├── login/route.ts     # POST: Admin Login → JWT Cookie
│           ├── search/route.ts    # GET: Kundensuche (Service Role)
│           ├── customer/route.ts  # GET: Kundenakte laden
│           └── actions/route.ts   # POST: Plan ändern, Export
```

---

## 🗄️ Datenbank-Schema

### Tabellen

| Tabelle | Beschreibung | RLS |
|---------|-------------|-----|
| `profiles` | User-Profil (auto-erstellt bei Signup) | ✅ own |
| `debts` | Schulden mit Gläubiger- und Bankdaten | ✅ own |
| `payments` | Einzelne Zahlungen (referenziert debt) | ✅ own |
| `agreements` | Generierte Vereinbarungen | ✅ own |

### Triggers

| Trigger | Tabelle | Funktion |
|---------|---------|----------|
| `on_auth_user_created` | `auth.users` | Erstellt automatisch ein `profiles` Eintrag |
| `enforce_debt_limit` | `debts` (BEFORE INSERT) | Blockt Insert wenn Free-Plan + >= 5 Schulden |
| `after_payment_insert` | `payments` (AFTER INSERT) | Aktualisiert `debts.paid_amount` automatisch |
| `after_payment_delete` | `payments` (AFTER DELETE) | Neuberechnung von `debts.paid_amount` |

### Schema: → `supabase/schema.sql`

---

## 🔄 Migrationsstrategie (Bestand → Supabase)

### Was sich ändert

| Vorher (HTML-App) | Nachher (Next.js + Supabase) |
|---|---|
| `let debts = [...]` im Code | `SELECT * FROM debts WHERE user_id = auth.uid()` |
| `debts.push({...})` | `supabase.from('debts').insert({...})` |
| `d.history.unshift({...})` | `supabase.from('payments').insert({...})` |
| `debts = debts.filter(...)` | `supabase.from('debts').delete().eq('id', ...)` |
| Kein Login | Supabase Auth (E-Mail + Passwort) |
| Daten weg bei Reload | Persistent in PostgreSQL |

### Milestones

```
M1: Projekt-Setup ✅
    Next.js + TypeScript + Tailwind + Supabase Clients

M2: Auth ✅
    Login, Register, Forgot, Middleware, Route Protection

M3: Datenbank ✅
    Schema + RLS + Triggers ausführen

M4: Service Layer ✅
    services.ts mit allen CRUD Operationen

M5: Dashboard ✅
    Server-gerendert mit echten Daten aus Supabase

M6: Admin Panel ✅
    Login, Kundensuche, Kundenakte, Plan-Management

M7: Debts CRUD (nächster Schritt)
    - /debts → Liste mit Filtern
    - /debts/[id] → Detail + Zahlungen + Edit + Delete
    - "Neue Schuld" Modal → createDebt() mit Free-Limit

M8: Payments
    - Zahlung erfassen Modal → createPayment()
    - Auto-Update paid_amount via Trigger

M9: Agreements
    - Vorlagen-Wizard → createAgreement()
    - Premium-Gate: Free-User sehen Upgrade-Hinweis

M10: PDF/Print
    - Übersicht drucken (bereits in alter App vorhanden)
    - Premium-Gate

M11: Deployment
    - Vercel Deploy
    - ENV setzen
    - ADMIN_USER/PASS für Produktion
```

### Beispiel: "Neue Schuld" Migration

**Vorher (Vanilla JS):**
```javascript
debts.push({
  id: Date.now(),
  name: n,
  emoji: selectedEmoji,
  original: a,
  paid: 0,
  rate: r,
  // ...
});
```

**Nachher (Service Layer):**
```typescript
// In einer Server Action oder API Route:
const supabase = await createServerSupabase();
const { data: { user } } = await supabase.auth.getUser();

const result = await createDebt(supabase, user.id, {
  name: formData.name,
  emoji: formData.emoji,
  original_amount: formData.amount,
  monthly_rate: formData.rate,
  due_date: formData.dueDate,
  // ...creditor fields, bank fields
});

if (result.error) {
  // "FREE_LIMIT_REACHED" → Upgrade-Hinweis zeigen
  // Andere Fehler → Toast-Nachricht
}
```

Der DB-Trigger `enforce_debt_limit` blockt den Insert serverseitig, falls Free + >= 5.

---

## 🚀 Setup-Anleitung

### 1. Supabase Projekt erstellen
1. https://supabase.com → Neues Projekt
2. SQL Editor öffnen → `supabase/schema.sql` komplett einfügen und ausführen
3. Unter Settings → API die Keys kopieren

### 2. Environment einrichten
```bash
cp .env.example .env.local
# Werte eintragen:
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Lokal starten
```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. Admin Panel testen
```
http://localhost:3000/admin/login
User: master
Pass: master
```

---

## 🌐 Deployment (Vercel)

```bash
# 1. Git Repo erstellen und pushen
git init && git add . && git commit -m "Initial"

# 2. Vercel verbinden
npx vercel

# 3. Environment Variables in Vercel setzen:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
#    SUPABASE_SERVICE_ROLE_KEY
#    ADMIN_USER (NICHT "master"!)
#    ADMIN_PASS (sicheres Passwort!)
#    ADMIN_JWT_SECRET (min. 32 Zeichen)

# 4. Deploy
npx vercel --prod
```

**Wichtig für Produktion:**
- `master/master` ist in `NODE_ENV=production` automatisch geblockt
- ADMIN_USER und ADMIN_PASS MÜSSEN gesetzt sein
- ADMIN_JWT_SECRET muss ein langes, zufälliges Geheimnis sein

---

## 📈 Skalierung & Nächste Schritte

### Kurzfristig
- [ ] Debts CRUD Seiten mit Supabase
- [ ] Payment Modal mit createPayment()
- [ ] Agreements mit Premium-Gate
- [ ] PDF Export (Premium)
- [ ] Stripe Integration für Premium-Zahlungen

### Mittelfristig
- [ ] E-Mail Erinnerungen (Supabase Edge Functions)
- [ ] Dashboard Charts (Recharts)
- [ ] Mehrsprachigkeit (i18n)
- [ ] PWA Support (offline-fähig)
- [ ] Supabase Realtime für Live-Updates

### Langfristig
- [ ] Desktop-App via Electron oder Tauri
- [ ] Mobile App via Capacitor oder React Native
- [ ] Team/Berater-Modus (Schuldnerberatung)
- [ ] AI-gestützte Tilgungsoptimierung
- [ ] Bankanbindung (Open Banking / PSD2)
