import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Strategy: IDIA (Worldpay TriPOS Cloud) ──────────────────────────
class IdiaStrategy {
  async process(amount: number, config: any) {
    const WORLDPAY_CLOUD_URL = "https://tripos.worldpay.com/api/v1/sale";
    const apiKey =
      Deno.env.get("WORLDPAY_API_KEY") || config.external_api_key || "";

    const payload = {
      laneId: config.idia_terminal_id,
      transactionAmount: {
        totalAmount: amount.toFixed(2),
        currencyCode: "USD",
      },
      vaultParams: {
        generateToken: true,
      },
      configuration: {
        appId: "IDIA_POS_2026",
        appVersion: "1.0",
        allowPartialApprovals: false,
        checkForDuplicateTransactions: true,
      },
    };

    try {
      const response = await fetch(WORLDPAY_CLOUD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "tp-authorization": `Version=1.0, Credential=${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      return {
        success: data.status === "Approved",
        transactionId: data.transactionId || null,
        provider: "IDIA",
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        transactionId: null,
        provider: "IDIA",
        error: err.message || "Worldpay request failed",
      };
    }
  }
}

// ── Strategy: Stripe (stub) ─────────────────────────────────────────
class StripeStrategy {
  async process(_amount: number, _config: any) {
    return {
      success: false,
      transactionId: null,
      provider: "Stripe",
      error: "Stripe Terminal integration not yet configured. Add your Stripe secret key to activate.",
    };
  }
}

// ── Strategy: Square (stub) ─────────────────────────────────────────
class SquareStrategy {
  async process(_amount: number, _config: any) {
    return {
      success: false,
      transactionId: null,
      provider: "Square",
      error: "Square Terminal integration not yet configured. Add your Square access token to activate.",
    };
  }
}

// ── Dispatcher ──────────────────────────────────────────────────────
const strategies: Record<string, IdiaStrategy | StripeStrategy | SquareStrategy> = {
  IDIA: new IdiaStrategy(),
  Stripe: new StripeStrategy(),
  Square: new SquareStrategy(),
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchant_id, amount, currency } = await req.json();

    if (!merchant_id || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "merchant_id and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up merchant config using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config, error: cfgErr } = await supabaseAdmin
      .from("merchant_payment_configs")
      .select("*")
      .eq("business_id", merchant_id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cfgErr || !config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No payment configuration found for this business",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const strategy = strategies[config.active_provider];
    if (!strategy) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown provider: ${config.active_provider}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await strategy.process(Number(amount), config);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
