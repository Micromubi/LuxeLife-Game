# Luxe Life

A luxury life sim that runs in your browser. Start with almost nothing, or with a trust fund, and build a fortune in a 3D city: work, hustle, invest, flip cars and property, run businesses and gamble. Look after yourself along the way, because bills, lawsuits and bad luck are always close.

## Play

1. Download **[`LuxeLife.html`](LuxeLife.html)**. Open it on GitHub, then use **Download raw file**.
2. Double-click it.

The whole game is in that one file. It works offline and saves automatically in your browser. Fonts load from Google when you're online; offline it uses standard fonts.

### Controls

- **Click a building** (or a venue on the city map) to go there and open its menu.
- **Drag** to look around and **scroll** to zoom. The camera stops as soon as you let go.
- **Needs attention** (above the bottom menu) suggests the best thing to do right now for whatever you're lacking. One click does it.
- **Home → 🚪 Go inside** walks you into your home. Click the bed, kitchen, shower, sofa, desk or hot tub to act it out.
- **☰ menu:** sound, graphics (Low / High / Ultra), export and import your save, and new game.

## How the game works

### Your character
- **Two starts.** *Old Money* begins with $50,000, a junior job and good credit. *New Blood* begins with $500 and a $2,000 loan, but earns 25% more per shift.
- **A 24-hour body clock.** Energy lasts about 16 waking hours and comes back with sleep (best at night, and better in nicer homes). You get hungry about every 5 hours, want a shower once a day, and get lonely after a day or two alone.
- **Mood** comes from your needs and health, and sets your pay: 0.75× when miserable, up to 1.15× when thriving.
- **Neglect costs money.** Starving or burning out damages your health. Poor hygiene leads to infections. Both end in clinic and hospital bills.
- **Your look** follows what you buy: street clothes, then suits, then haute couture, plus a gold watch. Once you own a car, you drive it around the city.

### Ways to make money
| | |
|---|---|
| **Career** | 2-hour shifts at Sterling & Vane Tower, from Intern ($25/h) to Chairman ($6,000/h). Promotions need shifts, prestige and the right wardrobe. Double shifts pay 2.2× but are hard on your body. Classes at the business school count toward promotion. |
| **Side jobs** | No career needed: food delivery, rideshare (needs a car; nicer cars earn better fares), freelance gigs, and creating content. Content pay grows with your followers, and posts sometimes go viral. |
| **Businesses** | Eight ventures from a $1,200 food cart to a $40M holding company. They earn every hour they're open. Earnings rise with staff morale (use Manage Ventures), your prestige and the day's market mood. |
| **Property** | Every home you own except the one you live in is rented out and pays daily rent. |
| **Stock market** | Eight companies (bank → **Markets**) whose prices move every hour, with sudden news jumps. There's a chart for each, buy and sell in any amount, and a 0.1% trading fee. |
| **Flipping** | The deals board (Skyline Realty or Prestige Motors) lists cars and property below market every morning. Fixer-uppers are cheapest, but you have to restore them to unlock their full value. Buy low, restore, sell. |
| **Funds** | An index fund (steady) and crypto (wild swings) in the Finance tab. |
| **Gambling** | Lottery tickets ($20, $2.5M jackpot at 1 in 250,000), slots, blackjack, the high-roller room and billionaires' poker. |
| **Luck** | Consumer booms, viral reviews, friends repaying debts, and the occasional inheritance. |

### Ways to go broke
- **Running costs:** upkeep on cars, homes and memberships, staff wages, studio rent and business costs, charged every day.
- **Taxes:** 10% on wages, and 20% on business profit every week.
- **Debt:** loan interest adds up daily, with a payment due every week. Miss three and the bank repossesses the asset.
- **Markets and gambling:** stock crashes, crypto swings, market slumps and losing streaks.
- **Big events:**
  - tax audits once you're worth over $1M
  - lawsuits once you're worth over $200k
  - robberies when you carry a lot of cash (a Social Concierge limits the damage)
  - tabloid scandals that hit your reputation and rattle your staff
- **Staff theft:** employees at businesses with low morale skim the till.
- **Bad luck:** pickpockets, car repairs, and cars and clothes losing value.
- **Hitting bottom:** if your cash stays below zero, you must fire-sell at 50%, take an emergency loan or declare bankruptcy. If your net worth stays negative for 3 days, everything is sold at 20% and lenders won't touch you for 14 days.

### Status
**Prestige** comes from what you own plus your reputation (which slowly fades). It unlocks careers, venues and luxury items. At 700 prestige you become **VIP** and the screen turns gold. Networking tokens from VIP tables, galas, yacht parties, the VIP box and the Monaco Grand Prix unlock the biggest businesses.

## The city

The city is a 3D island with a full day and night cycle tied to the game clock. Sunsets, lit windows, street lamps and club searchlights follow the time of day. Traffic drives the streets, people walk the pavements, and a skyline and hills sit across the bay. Every venue stands on its own landscaped lawn, with parks in between.

| Venue | What's there |
|---|---|
| 🏠 Home | Sleep, cook, shower, relax, call friends, create content, or go inside |
| 💼 Sterling & Vane Tower | Work shifts, freelance gigs |
| 🏦 Private Bank | Stock exchange, loans and credit |
| 🍽️ Maison Dorée | Street food to Michelin dining; delivery runs |
| 💆 Aurum Spa | Barber and spa days |
| 🍸 Club Noir | Drinks, VIP tables, galas, poker |
| 👜 The Boutique | Everything for sale |
| ⛲ Gilded Plaza | Your ledger |
| 🎓 Whitmore Business School | Classes that count toward promotion |
| 🏘️ Skyline Realty / 🏎️ Prestige Motors | Deals board for flips |
| 💎 Aurelia Jewellers | Watches and jewels |
| 🏋️ Iron & Oak Gym | Workouts that build health |
| 🏥 St. Regis Clinic | Check-ups and treatment |
| 🎰 Golden Palace Casino | Lottery, slots, blackjack, high-roller room |
| 🏟️ Crown Arena | Matches, concerts, VIP box |
| 🏖️ Azure Beach Club | Beach days, cabanas, yacht parties |
| ✈️ Sky Harbour Terminal | Getaways and the Monaco Grand Prix (60% cheaper with your own jet) |
| 🏗️ Ventures Row | Buy and run businesses |

**What you buy shows up in the world.** Your home upgrades from a rented studio to a flat, apartment, penthouse or villa. Cars park in your driveway, the jet waits on the runway, and a private island rises out of the sea with a causeway. Inside, your home matches what you own, from a brick studio to a marble penthouse with a hot tub. A private chef appears in your kitchen once you hire one.

## For developers

Built with React, TypeScript, Vite, Tailwind, Zustand, and three.js through React Three Fiber.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run build:play   # rebuild the single-file LuxeLife.html
```

### Code map
| Path | What it holds |
|---|---|
| `src/game/config.ts` | Game balance: catalog, careers, actions, stocks, lottery odds, decay rates |
| `src/game/engine.ts` | Pure game logic: the hourly tick, midnight bills and events, actions, buying and selling, loans, stocks, deals |
| `src/game/store.ts` | Zustand store and saving (older saves are upgraded automatically on load) |
| `src/world/layout.ts` | City grid, venue positions, walking routes |
| `src/world/World.tsx` | The 3D scene: sky, lighting, camera, buildings |
| `src/world/Venues.tsx`, `Buildings.tsx`, `Props.tsx` | Building models, roads, traffic, pedestrians, skyline |
| `src/world/Interior.tsx` | The walk-in home |
| `src/components/` | Screens and panels: money card, city map, quick actions, Markets, Shop, Finance… |

### Optional: Supabase cloud save
1. Create a Supabase project, run `supabase/schema.sql`, and turn on **Anonymous sign-ins**.
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Run `npm run dev`. Cloud save and load appear in the ☰ menu.

Cloud save trusts the browser, so it doesn't stop cheating. It's meant for keeping your own progress, not for leaderboards.
