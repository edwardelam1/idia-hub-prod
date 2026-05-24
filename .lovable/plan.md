## Plan: Update Best Friend AI persona mapping and remove routing hard stop

Edit `supabase/functions/best-friend-ai/index.ts`:

1. **Request schema** — remove `routing: z.enum(["fiat", "on-chain"]).optional()` from `requestSchema.context`.

2. **Remove ROUTING_RESOLUTION hard stop** — delete the entire `[BEGIN: ROUTING_RESOLUTION]` … `[END: ROUTING_RESOLUTION]` block (the `routing !== "fiat" && routing !== "on-chain"` validator and the 400 response). Stop reading `context.routing`.

3. **Synapse receipt body** — since `routing` is no longer guaranteed, drop it from the `synapse-controller` POST body (keep all other fields unchanged). Out of scope: changes to `synapse-controller` itself.

4. **Persona mapping** — add above `finalPayload`:
   ```ts
   const personaLabels: Record<AgentType, string> = {
     MEDICAL_AGENT: "Health Analyst",
     CONSTRUCTION_AGENT: "Project Architect",
     FINANCE_AGENT: "Financial Controller",
     GENERAL_NAVIGATOR: "Best Friend",
   };
   ```
   Change `persona: isDataScientistMode ? "Chief Researcher" : "Store Clerk"` → `persona: personaLabels[detectedAgent]`.

5. **Deploy** the `best-friend-ai` edge function after the edit.

No other files touched. No DB or frontend changes.
