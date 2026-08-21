# Remove "DELT" from all public-facing labels

Replace every user-visible occurrence of "DELT" with "Liability Shield". Internal identifiers (table names, enum values, channel names, code comments, function names) stay untouched so nothing breaks.

## Visible text to change

**Compliance Center** (`src/components/compliance/ComplianceDashboard.tsx`)
- Subtitle: "...active DELT agreements" -> "...active Liability Shield agreements"
- Metric card "Active DELTs" -> "Active Liability Shields"; its caption "Data Escrow Liability Transfers" -> "Liability Shield agreements"
- Tab label "DELT Protocol" -> "Liability Shield"

**Trading interface** (`src/components/trading/TradingInterface.tsx`)
- Toast "DELT Protocol Secured" -> "Liability Shield Secured"
- Toast "DELT Transfer Failed" -> "Liability Shield Transfer Failed"
- Copy "requires DELT wrapping and Synapse credits" -> "requires Liability Shield wrapping..."
- Copy "manage your portfolio securely via DELT" -> "...via the Liability Shield"

**Pipeline monitor** (`src/components/health/PipelineMonitor.tsx`)
- Step title "4. Process DELT Transfer" -> "4. Process Liability Shield Transfer"

**System health dashboard** (`src/components/system/SystemHealthDashboard.tsx`)
- Live pulse label "DELT MINTED: ..." -> "LIABILITY SHIELD MINTED: ..."

## Left as-is (not public-facing)

- Code comments, variable names (`isDeltAuthorized`), activity type keys (`delt_transfer`), channel names
- Database tables/columns (`delt_transfers`), manifest flag `delt_enabled`, account status `DELT_AUTHORIZED`
- Edge function names and their server-side logs (`process-delt-transfer`, `DELT-<timestamp>` reference IDs) — these are internal audit identifiers, not shown as labels

If you also want internal reference IDs and account-status strings renamed, that requires a data migration and I'd handle it separately.
