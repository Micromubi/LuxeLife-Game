# Luxe Life — MVP

A browser-based luxury life sim. **Work → Earn → Spend → Survive.**

## Play right now
Double-click **`LuxeLife.html`**. It's the whole game in one file and saves automatically in your browser.

## Develop
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run build:play   # rebuild the single-file LuxeLife.html
```

## The 3D city
The game plays out in a low-poly 3D city (three.js via React Three Fiber):
- **Click a building to go there**: Sterling & Vane Tower (work), Maison Dorée (dine), Home (sleep/rest), Aurum Spa (grooming), Club Noir (society), The Boutique (shop), Private Bank (loans), Gilded Plaza (ledger), Ventures Row (businesses).
- Your character walks the streets to wherever you act, and walks faster once you own a car. Their outfit changes as you buy clothes (street → suit → tailored → couture), and a watch appears on their wrist.
- Home changes from rented studio → apartment → penthouse → villa; cars park in your driveway; a private jet gets an airstrip; the private island rises out of the sea with a causeway.
- Businesses appear on Ventures Row (empty "For sale" lots until you buy them).
- Real day/night cycle tied to the game clock: windows light up, street lamps glow, club searchlights sweep the sky.
- Drag to orbit, scroll to zoom.
- The Luxe look: gold-and-serif overlays, champagne road lines, black-and-gold Luxe cabs, a physical sky with real sunsets, reflective sea, glossy wet roads at night, street-lamp light pools, a skyline and hills across the bay, beach and marina, traffic with headlights, and people on the pavements.
- A bigger city with 18 places to go, including Whitmore Business School (classes count toward promotion), Iron & Oak Gym (builds health), St. Regis Clinic, Golden Palace Casino (slots, blackjack, high-roller room), Crown Arena (matches, concerts, VIP box), Azure Beach Club (cabanas, yacht parties), Sky Harbour Terminal (getaways and the Monaco Grand Prix, 60% cheaper with your own jet), and dedicated shops: Prestige Motors, Skyline Realty and Aurelia Jewellers.
- Own a car and you drive it (instead of walking); the camera chases you while you travel.
- On screen: a gold cash card with +/− notes, a north-up city map (click a venue to go there, ◎ Me to find yourself) with health and need bars, and the venue name in serif when you arrive.
- ☰ → Graphics: Low (older PCs), High (default), Ultra (real-time sea reflections).

## Realistic wellbeing
- A 24-hour body clock: energy lasts ~16–18 waking hours (faster at work and after midnight), you get hungry about every 5 hours, want a shower once a day, and get lonely after a day or two alone. Sleep, not coffee, restores energy — best at night (21:00–09:00), and better homes sleep better.
- Venues keep real hours (office shifts start 07:00–18:00, clubs 21:00–03:00, galas in the evening…). You can't eat when you're full or sleep when you're not tired.
- **Mood** (from all your needs and health) sets your pay multiplier: 0.75× when miserable, up to 1.15× when thriving.
- Health drops when you starve or burn out; poor hygiene risks infections and clinic bills.

## Getting rich faster (realistically)
- Higher wages and faster promotions (Intern $25/h → Chairman $6,000/h).
- **Side hustles** from $1,200 (food cart, online reseller, car wash) that pay back in 1–2 game weeks. Businesses only earn during their opening hours.
- **Finance**: mortgages (20% down), car finance (15%) and business loans (30%) with weekly instalments; miss three and the asset is repossessed.
- **Landlord income**: every property except your home is let out for daily rent.
- **Investments**: an index fund and crypto that move every midnight.

## What's in the MVP
- **Character creation** — Old Money / Nepo ($50,000, Junior Analyst, 720 credit) or New Blood / Lapo ($500 + $2,000 loan at 1.5%/day, "Hungry" +25% pay).
- **Real-time clock** — one tick = one in-game hour (Leisurely 60s, Standard 15s, Hustle 5s; pausable). Needs decay every tick (energy −2, hunger −1, hygiene −1, social −0.5), businesses earn, and bills arrive at midnight.
- **Actions take time** — work shifts (4h), double shifts, dining, sleep, grooming, social events. Low energy halves productivity; low hygiene hurts pay and reputation; starving damages health and leads to hospital bills.
- **Boutique** — 32 items across indulgences, wardrobe, garage, real estate, jewels & watches, staff, and ventures. Every asset carries prestige, upkeep, resale value and/or need mitigation (sedan cuts commute fatigue, chef halves hunger decay, penthouse spa halves hygiene decay…).
- **Career ladder** — Intern → Chairman, gated by shifts, prestige and wardrobe (a Business Suit to make Associate).
- **Prestige meter** — assets + decaying reputation; tiers Nobody → Dynasty. At 700 the dashboard switches to the gold **VIP** theme.
- **Businesses** — revenue scales with staff morale, your prestige, volatility and daily market mood; payroll daily, 20% profit tax weekly. Bigger ventures need networking tokens earned at VIP tables and galas.
- **Debt & ruin** — compounding loans with weekly instalments; three misses → repossession. Cash below zero for 2 ticks → **"You're broke"** modal (fire-sell at 50%, emergency loan, or declare bankruptcy). Net worth negative 3 days → **Liquidation** (assets sold at 20%, credit 300, locked out 14 days).
- **Feedback** — gold shimmer and chime on purchases, register click on pay, pulsing red border when a need is critical.
- **Saves** — localStorage autosave, export/import JSON, and optional Supabase cloud save.

## Optional: Supabase cloud save
1. Create a Supabase project, run `supabase/schema.sql`, and enable **Anonymous sign-ins**.
2. Copy `.env.example` → `.env` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. `npm run dev` — Cloud save/load appears in the ☰ menu.

## Code map
- `src/game/config.ts` — all tuning: catalog, careers, actions, decay rates, thresholds.
- `src/game/engine.ts` — pure game logic (`simulateHour`, `doAction`, `buy`, `sell`, `borrow`, `liquidate`…).
- `src/game/store.ts` — Zustand store + persistence.
- `src/hooks/useGameLoop.ts` — the real-time tick.
- `src/components/` — UI.
