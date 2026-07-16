import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// Strict CORS to ensure the Sovereign Node can request this from any IP/Localhost
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.info("⚙️ [EDGE: hydrate-terminal] START: Invocation received.");

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    console.info("⚙️ [EDGE: hydrate-terminal] PROGRESS: Resolving CORS preflight.");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Extract Payload
    const { pairing_code } = await req.json();
    console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Extracted pairing_code: ${pairing_code}`);

    if (!pairing_code) {
      throw new Error("Missing pairing_code in request body.");
    }

    // 3. Initialize Supabase Admin Client
    // We MUST use the SERVICE_ROLE key because the terminal is currently unauthenticated 
    // and the vault table's RLS blocks anonymous reads. The code IS the credential.
    console.info("⚙️ [EDGE: hydrate-terminal] PROGRESS: Initializing secure Admin client.");
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Query the Vault
    console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Querying idia_schema_manifest_vault for code: ${pairing_code}`);
    const { data, error } = await supabaseAdmin
      .from('idia_schema_manifest_vault')
      .select('*')
      .eq('pairing_code', pairing_code)
      .single();

    if (error) {
      console.error(`⚙️ [EDGE: hydrate-terminal] DB_ERROR: ${error.message} | Code: ${error.code}`);
      throw new Error(`Failed to locate blueprint for code: ${pairing_code}`);
    }

    if (!data || !data.schema_payload) {
      console.error(`⚙️ [EDGE: hydrate-terminal] LOGIC_ERROR: Record found but schema_payload is empty.`);
      throw new Error("Corrupted blueprint in vault.");
    }

    // 5. Successful Handshake
    console.info("⚙️ [EDGE: hydrate-terminal] END: Blueprint located. Dispatching to Sovereign Node.");

    // Dynamically hunt for the table's primary relational identifier
    const relationalBusinessId =
      (data as any).business_id ||
      (data as any).organization_id ||
      (data as any).merchant_id ||
      (data as any).id;

    // 6. Resolve blueprint assignment (best-effort — never fails the hydrate)
    let assignment: Record<string, unknown> | null = null;
    let blueprintStatus: string | null = null;
    try {
      console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Looking up blueprint assignment for code: ${pairing_code}`);
      const { data: bp, error: bpErr } = await supabaseAdmin
        .from('device_provisioning_blueprints')
        .select('assigned_employee_id, assigned_at, status')
        .eq('code', pairing_code)
        .maybeSingle();

      if (bpErr) {
        console.warn(`⚙️ [EDGE: hydrate-terminal] BLUEPRINT_LOOKUP_WARN: ${bpErr.message}`);
      } else if (bp) {
        blueprintStatus = bp.status ?? null;
        console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Blueprint row found. status=${bp.status} assigned_employee_id=${bp.assigned_employee_id ?? 'none'}`);

        if (bp.assigned_employee_id) {
          let employee_name: string | null = null;
          let employee_email: string | null = null;
          try {
            console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Resolving employee ${bp.assigned_employee_id}`);
            const { data: emp, error: empErr } = await supabaseAdmin
              .from('employees')
              .select('name, email, user_id')
              .eq('id', bp.assigned_employee_id)
              .maybeSingle();

            if (empErr) {
              console.warn(`⚙️ [EDGE: hydrate-terminal] EMPLOYEE_LOOKUP_WARN: ${empErr.message}`);
            } else if (emp) {
              employee_name = emp.name ?? null;
              employee_email = emp.email ?? null;

              // Fall back to auth user_metadata.full_name (PII bridge parity)
              if (!employee_name && emp.user_id) {
                try {
                  const { data: authRes } = await supabaseAdmin.auth.admin.getUserById(emp.user_id);
                  const meta = (authRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
                  employee_name =
                    (meta.full_name as string) ||
                    (meta.name as string) ||
                    null;
                  if (!employee_email) {
                    employee_email = authRes?.user?.email ?? null;
                  }
                } catch (authErr: any) {
                  console.warn(`⚙️ [EDGE: hydrate-terminal] AUTH_LOOKUP_WARN: ${authErr?.message ?? authErr}`);
                }
              }
            }
          } catch (e: any) {
            console.warn(`⚙️ [EDGE: hydrate-terminal] EMPLOYEE_RESOLVE_WARN: ${e?.message ?? e}`);
          }

          assignment = {
            employee_id: bp.assigned_employee_id,
            employee_name,
            employee_email,
            assigned_at: bp.assigned_at ?? null,
            status: bp.status ?? null,
          };
          console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Assignment resolved. employee_name=${employee_name ?? '(unknown)'}`);
        } else {
          console.info("⚙️ [EDGE: hydrate-terminal] PROGRESS: Blueprint row is unassigned.");
        }
      } else {
        console.info("⚙️ [EDGE: hydrate-terminal] PROGRESS: No blueprint row for code (legacy vault-only entry).");
      }
    } catch (e: any) {
      console.warn(`⚙️ [EDGE: hydrate-terminal] BLUEPRINT_RESOLVE_WARN: ${e?.message ?? e}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: blueprintStatus,
        assignment,
        assigned_employee_id: (assignment?.employee_id as string) ?? null,
        assigned_employee_name: (assignment?.employee_name as string) ?? null,
        assigned_employee_email: (assignment?.employee_email as string) ?? null,
        assigned_at: (assignment?.assigned_at as string) ?? null,
        assignment_status: blueprintStatus,
        payload: {
          ...(data.schema_payload as Record<string, unknown>),
          businessId: relationalBusinessId,
          assignment,
          assigned_employee_id: (assignment?.employee_id as string) ?? null,
          assigned_employee_name: (assignment?.employee_name as string) ?? null,
          assigned_employee_email: (assignment?.employee_email as string) ?? null,
          assigned_at: (assignment?.assigned_at as string) ?? null,
          assignment_status: blueprintStatus,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    // Granular Failure Logging
    console.error(`⚙️ [EDGE: hydrate-terminal] CRITICAL_FAILURE: ${error.message}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})