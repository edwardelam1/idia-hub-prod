## Hospitality Module Expansion — Hotel/PMS + High-Volume Bar/Nightlife

Goal: extend the hospitality vertical (and only hospitality) with two operational sub-modules that map cleanly into the existing `NanoBite` shape, so the App Builder treats them like every other vertical (selectable, persistable, gated by tier). No new types, no new schema, no third-party brand names.

### 1. Sub-vertical structure (industries/tertiary.ts)

Split `tertiary.hospitality` into two child industry nodes so the Builder can route taxonomy and bites correctly. Keep the parent `tertiary.hospitality` as the umbrella.

Add to `TERTIARY_INDUSTRIES`:

- `tertiary.hospitality.lodging` — label "Hospitality — Lodging & PMS", parentId `tertiary.hospitality`, tags `['lodging','pms','multi_channel','perishable_inventory']`, defaultProductionMethod `job_shop`, defaultArchetype `mid_market`. meta: `tech_stack: ['Property Management System','Channel Manager','Booking Engine','Mobile Key']`, `telemetry_focus: ['ADR','Occupancy','RevPAR','Turn Time']`.
- `tertiary.hospitality.bar_nightlife` — label "Hospitality — Bar & Nightlife", parentId `tertiary.hospitality`, tags `['high_velocity','tab_based','liquid_inventory','time_priced']`, defaultProductionMethod `batch`, defaultArchetype `mass_market`. meta: `tech_stack: ['Tab Manager','Pour Scale Integration','Recipe Engine','Time-Window Pricing']`, `telemetry_focus: ['Pour Variance','Tab Velocity','Walkout Rate']`.

Existing `tertiary.hospitality` parent stays for backward compatibility with current nano-bites.

### 2. Nano-bites (nanoBites/hospitality.ts)

Append the new bites to `HOSPITALITY_BITES`. Each entry follows the existing shape — `id`, `industryId`, `valueChainStage`, `microElement`, `task`, `cadence`, `automatable`, optional `requiresTier`. No brand names. Tier mapping: routine ops = basic, automation/dynamic engines = pro, multi-channel/analytics = enterprise.

#### Hotel & PMS bites (`industryId: 'tertiary.hospitality.lodging'`)

| id | microElement | task | cadence | auto | tier |
|---|---|---|---|---|---|
| `hosp.lodging.reservations.unified_calendar` | Reservation Management | Sync OTA, direct, and walk-in bookings into a single inventory calendar to prevent overbookings | event | true | pro |
| `hosp.lodging.frontdesk.auto_checkin` | Front Desk | Automated check-in/out flow with mobile key issuance | event | true | pro |
| `hosp.lodging.frontdesk.room_assignment` | Front Desk | Optimize room assignment by guest preference and turn status | event | true | basic |
| `hosp.lodging.housekeeping.status_board` | Housekeeping | Real-time clean/dirty/inspected room status from mobile updates | event | true | basic |
| `hosp.lodging.maintenance.work_orders` | Maintenance | Open, route, and close maintenance tickets tied to room/asset | event | true | basic |
| `hosp.lodging.crm.guest_profile` | Guest CRM | Centralize guest history, preferences, and stay notes (PII-free identifiers only) | daily | true | pro |
| `hosp.lodging.revenue.dynamic_rates` | Revenue Management | Push dynamic ADR/occupancy-driven rates across all channels | daily | true | enterprise |
| `hosp.lodging.billing.guest_folio` | Billing | Maintain guest folio with split charges and secure payment capture | event | true | pro |
| `hosp.lodging.finance.gl_export` | Financial Integration | Export folio activity to accounting general ledger | weekly | true | pro |
| `hosp.lodging.analytics.occupancy_revpar` | Reporting | Generate ADR, occupancy, and RevPAR performance reports | daily | true | enterprise |
| `hosp.lodging.integrations.channel_pos` | Integrations | Maintain connections to channel managers, booking engines, and on-property POS | daily | true | enterprise |

#### Bar & Nightlife bites (`industryId: 'tertiary.hospitality.bar_nightlife'`)

| id | microElement | task | cadence | auto | tier |
|---|---|---|---|---|---|
| `hosp.bar.tabs.preauth_hold` | Tab Management | Place pre-authorization hold on card to prevent walkouts | event | true | pro |
| `hosp.bar.tabs.quick_access` | Tab Management | Open and recall tabs by name or seat number with macro buttons | event | false | basic |
| `hosp.bar.order.modifier_swap` | Order Entry | Mid-order spirit/mixer swap without restarting the ticket | event | false | basic |
| `hosp.bar.recipe.lookup` | Recipe Engine | Surface canonical drink recipe for pour consistency | event | false | pro |
| `hosp.bar.inventory.pour_tracking` | Pour Tracking | Capture liquid volume (oz/ml) from scale or flow meter per pour | event | true | pro |
| `hosp.bar.inventory.recipe_costing` | Cost Control | Auto-deduct fluid ounces from inventory using recipe yields | event | true | pro |
| `hosp.bar.pricing.happy_hour_window` | Dynamic Pricing | Apply time-windowed Happy Hour pricing automatically | event | true | basic |
| `hosp.bar.pricing.amenity_time_charge` | Dynamic Pricing | Bill time-based amenity usage (table/simulator/lane) by the minute | event | true | pro |
| `hosp.bar.analytics.pour_variance` | Analytics | Reconcile poured vs. sold volume and flag variance | daily | true | enterprise |

All `microElement` and `task` strings are generic — no third-party product names.

### 3. UI / Builder integration

No changes required to `PayAppBlueprint.tsx` or `getNanoBitesFor`. Both are already industry-id-driven and render the new bites automatically with checkboxes, "select all / clear all", tier badges, and persistence into `selectedNanoBiteIds` on the merchant blueprint. Selecting either child industry (Lodging or Bar & Nightlife) will surface the appropriate set; selecting the parent `tertiary.hospitality` keeps showing the existing spatial/telemetry bites.

### 4. Files touched

- `src/taxonomy/industries/tertiary.ts` — append two child industry nodes under `tertiary.hospitality`.
- `src/taxonomy/nanoBites/hospitality.ts` — append 11 lodging bites + 9 bar/nightlife bites to `HOSPITALITY_BITES`.

No migrations, no edge functions, no schema changes. Existing bites and the parent node remain untouched for backward compatibility.

### 5. Verification

- App Builder → select Hospitality → Lodging & PMS shows 11 bites grouped under Front Desk, Housekeeping, CRM, Revenue, Billing, Reporting, Integrations.
- Selecting Bar & Nightlife shows 9 bites covering Tabs, Modifiers, Pour Tracking, Dynamic Pricing, Variance.
- Tier badges render (basic/pro/enterprise) and selections persist into the exported `merchant_blueprint.json` under `taxonomy.nanoBites`.
- Grep confirms no third-party brand strings introduced.
