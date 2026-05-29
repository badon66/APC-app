# Fieldbase — Build Prompt V1
## Sales Management App for Alberta Premium Coatings

Please read this entire document carefully before writing anything. I have also attached photos of our physical Asphalt and Concrete quote cards and a PWA icon file. Use the card photos to understand the exact services and layout. Ask any questions before starting.

**Rules for the entire build:**
- Build one module at a time in the exact order listed
- After each module tell me exactly what to test and wait for my confirmation before continuing
- Never touch previous module code unless I specifically ask
- Do not move on if something is broken — fix it first
- Initialize Git at the start and commit after each confirmed module
- When complete end your response with **DONE** so I know you finished

---

## Pre-answered setup questions

**Package manager:** npm

**Quote type layout:** Three options at the top of every new quote — Asphalt, Concrete, or Both. When Both is selected group into two sections: "Asphalt Services" then "Concrete Services" with a clear divider between them.

**Tax & Discount:** Manual dollar amount entry only. No percentage option.

**Estimator name:** Remember last name entered using localStorage. Auto-fill on every new quote.

**PWA icon:** I am attaching a premade 512x512 PNG file called `APC_PWA_Icon.png`. Use this directly.

**Both subtotals:** Combined sum of all asphalt and concrete line items at each tier for Low, Mid, and High.

---

## CRITICAL RULES — never break these

1. **No authentication in V1.** No login page. No auth middleware. No Supabase Auth. App opens directly to the Quotes tab. Auth comes in V2.

2. **Hardcoded business ID.** Create `lib/config.ts` as the very first file with exactly this:
```typescript
export const BUSINESS_ID = 'b995f64e-db6d-49e1-a27d-995ab99bcce3'
export const APP_NAME = 'Fieldbase'
export const BUSINESS_NAME = 'Alberta Premium Coatings'
```
Use `BUSINESS_ID` on every single Supabase query. Never use localStorage for the business ID. Never use a seed function. Never make the business ID dynamic. This is permanent and hardcoded forever in V1.

3. **No seed function.** The database already has data. Do not write any seeding logic. Just query what's there.

4. **`.env.local` first.** Before writing any other code confirm `.env.local` exists with these keys filled in:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```
If not filled in, stop and ask the user to fill them in before continuing.

5. **Every button must work before moving on.** No broken UI. No placeholders that don't function.

6. **Phone first.** Every screen designed at 375px width. Big tap targets minimum 44px.

---

## Tech stack

- **Framework:** Next.js App Router + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (Postgres only — no auth)
- **Voice:** Web Speech API + Anthropic Claude API via secure server route
- **Deployment:** Vercel (PWA installable on phone and desktop)

---

## Database — already exists in Supabase

Do not create these tables — they already exist. Just query them.

**businesses** — id, name, phone, email, website, address, created_at

**customers** — id, business_id, name, phone, email, address, notes, created_at

**jobs** — id, business_id, customer_id, title, status (new/in_progress/complete), scheduled_date, address, notes, earliest_date, latest_date, preferred_time, booking_notes, created_at

**voice_notes** — id, business_id, job_id, raw_transcript, structured_output (jsonb), created_at

**service_rates** — id, business_id, service_name, unit, category (asphalt/concrete/both), rate_low, rate_mid, rate_high, active, sort_order

**quotes** — id, business_id, customer_id, job_id, quote_type (asphalt/concrete/both), selected_tier (low/mid/high), line_items (jsonb), subtotal_low, subtotal_mid, subtotal_high, tax, discount, total, status (draft/sent/accepted), estimator_name, customer_phone, notes, created_at

---

## Design system

- **Background:** `#111111`
- **Surfaces:** `#1C1C1E`
- **Cards:** `#242424`
- **APC green:** `#3FA82A` — buttons, active states, selected tier, key totals only
- **Text primary:** `#F5F5F5`
- **Text secondary:** `#888888`
- **Borders:** `rgba(255,255,255,0.08)`
- **Font:** Inter or system sans-serif. Bold headings, regular body.
- **Cards:** 12px border radius, generous padding
- **Navigation:** Fixed bottom tab bar — 4 tabs: Quotes · Customers · Jobs · Settings
- **Feel:** Premium dark SaaS tool. Spacious. Never cramped. Professional.

**Build these reusable components first:**
Button, Card, Input, Select, Modal, Badge, PageHeader, BottomNav, EmptyState, TierSelector

---

## Module build order

---

### MODULE 1 — App shell + design system

- Initialize Git
- Next.js + Tailwind + Supabase client
- `lib/config.ts` with hardcoded BUSINESS_ID
- Dark APC theme globally applied
- All reusable UI components
- Bottom tab navigation: Quotes · Customers · Jobs · Settings
- App opens directly to Quotes tab — no login ever
- PWA manifest using attached icon

**✅ Test:** `npm run dev` → `localhost:3000` → dark app opens, 4 tabs visible, no login screen. **DONE**

---

### MODULE 2 — Quote Calculator ⭐ MOST IMPORTANT

**Context:** APC gives customers physical printed quote cards. There are two versions — Asphalt and Concrete. I am attaching photos of both. The app is an internal calculator — the estimator enters measurements on their phone, the app calculates the price, then the estimator writes those numbers onto the physical card to hand the customer. This is NOT a customer facing document.

**How pricing works:** Every service has THREE rates — Low, Mid, High. The estimator picks one tier for the whole quote. All services calculate at that tier instantly. All three totals always show side by side so the estimator can see the full price range at a glance.

---

**Quote list screen:**
- List of saved quotes showing: customer name or address, quote type badge (Asphalt/Concrete/Both), selected tier badge, grand total, date
- Green + button to create new quote
- Clean empty state when no quotes exist

---

**New quote screen — full layout top to bottom:**

**Section 1 — Customer info:**
- Customer name (text input)
- Address (text input)
- Phone number (text input)
- Estimator name (text input, auto-fills from localStorage)
- Date (auto-fills today, editable)

**Section 2 — Quote type selector:**
- Three buttons: **Asphalt | Concrete | Both**
- Tapping changes which services load below instantly

**Section 3 — Tier selector (most important UI element):**
- Three large tappable buttons: **LOW | MID | HIGH**
- Currently selected tier highlighted in APC green
- Tapping instantly recalculates all line totals and summary

**Section 4 — Service line items:**

If Asphalt selected:
- Oil-Based Sealcoat | sq ft input | line total
- Hot Rubber Crack Filler | sq ft input | line total
- Asphalt Patch | sq ft input | line total
- Other Services | description input | flat rate input | line total

If Concrete selected:
- Solvent-Based Clear Coat | sq ft input | line total
- Clear Epoxy Crack Filler | sq ft input | line total
- Slip-Resistant Additive | sq ft input | line total
- Painted Concrete / Stain | sq ft input | line total
- Other Services | description input | flat rate input | line total

If Both selected:
- Show all asphalt services first under "Asphalt Services" header
- Divider line
- Show all concrete services under "Concrete Services" header

Each service row:
- Service name label on left
- Large number input in middle (sq ft or flat amount)
- Calculated line total on right (volume × rate at selected tier)
- Updates live as user types
- Grayed out if volume is 0

**Section 5 — Totals summary:**
Three columns always visible:
```
LOW        MID        HIGH
$850       $1,100     $1,400
```
Selected tier column highlighted green. Tapping a column switches the selected tier.

Below that:
- Tax / Fees — manual dollar input
- Discount — manual dollar input
- **BALANCE DUE** — large bold green — auto calculated

**Section 6 — Notes:**
- Comments / notes text area

**Save button** — saves to Supabase, redirects to quote detail screen

---

**Quote detail screen:**
- All quote info displayed cleanly
- Tier selector still works — can switch and resave
- All three totals still visible
- Status: Draft → Sent → Accepted (tap to change)
- Edit button
- Delete option

---

**✅ Test — all of these must pass:**
1. Tap + → new quote screen opens
2. Select Asphalt → asphalt services load
3. Enter sq ft values → line totals calculate instantly
4. Tap LOW / MID / HIGH → all totals update instantly
5. Three totals show side by side at all times
6. Select Concrete → concrete services load correctly
7. Select Both → two grouped sections show
8. Save → redirects to detail screen
9. Quote appears in list
10. Rates pull correctly from Supabase service_rates table

**Do not move to Module 3 until all 10 pass. DONE**

---

### MODULE 3 — Customers

**List screen:**
- Search bar
- Customer cards: name, phone, address
- + button to add
- Empty state

**Add/Edit form:**
- Name (required), Phone, Email, Address, Notes
- Saves instantly, appears in list

**Customer profile:**
- Contact info
- Their linked quotes
- Their linked jobs

**✅ Test:** Add customer → appears in list → profile opens → edit saves. **DONE**

---

### MODULE 4 — Jobs

**List screen:**
- Filter: All / New / In Progress / Complete
- Job cards with status badges
- + to create

**Job detail:**
- All info
- Status cycle: New → In Progress → Complete
- Booking Preferences card:
  - Earliest available date
  - Latest desired date
  - Preferred time: Morning / Afternoon / Either / No Preference
  - Restrictions / notes (gate code, dog, etc.)
- Voice notes section (placeholder for Module 5)

**✅ Test:** Create job → status changes → booking preferences save. **DONE**

---

### MODULE 5 — Voice Notes

On job detail screen:
- Large mic button
- Tap to record — live transcript (Web Speech API)
- Structure with AI button → calls `/api/structure-note` (Anthropic Claude)
- Returns: square footage, services needed, conditions, customer requests, summary
- Structured output in clean cards
- Both raw and structured saved to voice_notes table

**✅ Test:** Record → transcript shows → structure → clean fields appear → saved. **DONE**

---

### MODULE 6 — Settings

**Business info:** name, phone, email, address — editable, saves to Supabase

**Service rates table:**
- All services with three columns: Low | Mid | High
- All editable inline
- + Add Service button — adds new service with name, unit, category, rates
- Toggle active/inactive
- Save all changes

**✅ Test:** Edit a rate → save → build quote → new rate used in calculation. **DONE**

---

## After all modules confirmed → deploy to Vercel with `npx vercel --prod`

---

## Final rules
- `BUSINESS_ID` from `lib/config.ts` on every single Supabase query — no exceptions
- Phone first always — 375px
- Spacious layouts — never cramped
- Git commit after every confirmed module
- Clean folders: `/app` `/components` `/lib` `/api`
- End every completed response with **DONE**

**Start with Module 1. Confirm `.env.local` is filled in first. Wait for my confirmation before Module 2.**
