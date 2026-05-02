# Hospitality Density Expansion — Round 2

Append the user-supplied bites verbatim to `src/taxonomy/nanoBites/hospitality.ts`, organized into clearly-labeled sections.

## Files Touched

**Modified**: `src/taxonomy/nanoBites/hospitality.ts`

## Bites To Append (37 total)

### Theme Park (`tertiary.hospitality.theme_park`) — 17 bites
Grouped into 6 sections:
1. Guest Mgmt, Queues & Entitlements (4): biometric ticket sync, virtual boarding group, expedited queue yield mgmt, VIP tour routing
2. Attraction Operations (3): THRC vs AHRC throughput, 101 downtime codes, block-zone E-Stop reset
3. Entertainment & Show Control (3): character spatial rotation, performer equity heat-index cool-downs, parade GPS show control
4. Mega-Park F&B (2): mobile order throttle, Red Ticket allergy chain-of-custody
5. EVS & Logistics (3): Code V biohazard dispatch, restroom IoT turnover, fleet headway
6. Security & Incident Command (2): lost-child lockdown, lightning weather evacuation

### Café & Bakery (`tertiary.hospitality.cafe_bakery`) — 5 bites
Batch routing, modifier matrix POS, waste/spoilage log, coffee roast-date FIFO, frictionless loyalty.

### Catering & Banquets (`tertiary.hospitality.catering`) — 5 bites
BEO generation, pack sheet sync, scaled prep lists, deposit schedule, event staffing matrix.

### Home Services / STR (`tertiary.hospitality.home_services`) — 5 bites
Dynamic door codes, vendor dispatch, damage escrow pre-auth, property inspection w/ photo, owner statement w/ commission deduction.

## Notes & Tier Distribution

- Two bites use `valueChainStage: 'production'` and several use `'sales'`, `'marketing'`, `'finance'` — these are **not** in the existing `ValueChainStage` union (`inbound_logistics | operations | outbound_logistics | marketing_sales | service | infrastructure | human_resources | technology | procurement`). I will normalize on insert:
  - `'production'` → `'operations'`
  - `'sales'` → `'marketing_sales'`
  - `'marketing'` → `'marketing_sales'`
  - `'finance'` → `'infrastructure'`
- This preserves type safety without weakening the union. The `microElement` field is free-form string and passes through verbatim (e.g., `'pos'`, `'kitchen'`, `'crm'`, `'facilities'`).
- All bites preserve user-supplied `id`, `task`, `cadence`, `automatable`, and `requiresTier`.
- No mock/placeholder data; production-ready.

## Quality Bar

- Inserted as one append block, section-commented to mirror existing file style.
- Bite count post-merge: existing (~38 from prior round) + 37 new = ~75 hospitality bites, plus the original fine_dining/diner/bar_nightlife seed bites.
- No changes to taxonomy types, routing, or industry nodes — `theme_park`, `cafe_bakery`, `catering`, `home_services` industry nodes already exist in `hospitality.ts` industries file.
