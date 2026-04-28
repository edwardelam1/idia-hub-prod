import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

function mapCSVRows(rows: Record<string, string>[]): any[] {
  return rows.map(row => {
    const findField = (candidates: string[]): string => {
      for (const c of candidates) {
        const key = Object.keys(row).find(k => k.includes(c));
        if (key && row[key]) return row[key];
      }
      return "";
    };
    return {
      name: findField(["name", "item", "product", "description"]),
      sku: findField(["sku", "item number", "item_number", "item#", "code"]),
      gtin: findField(["gtin", "upc", "barcode", "ean"]),
      category: findField(["category", "cat", "type", "group"]) || "Supplies",
      quantity: parseFloat(findField(["quantity", "qty", "count", "stock", "on hand", "on_hand"])) || 0,
      unit_of_measure: findField(["unit", "uom", "unit_of_measure", "measure"]) || "units",
      cost_per_unit: parseFloat(findField(["cost", "price", "unit cost", "unit_cost", "unit price"])) || 0,
    };
  }).filter(item => item.name);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileContent = "";
    let fileName = "";
    let fileBytes: Uint8Array | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) throw new Error("No file uploaded");
      fileName = file.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        fileContent = await file.text();
      } else {
        fileBytes = new Uint8Array(await file.arrayBuffer());
      }
    } else {
      throw new Error("Expected multipart/form-data");
    }

    // CSV: parse directly
    if (fileName.endsWith(".csv") && fileContent) {
      const rows = parseCSV(fileContent);
      const items = mapCSVRows(rows);
      return new Response(JSON.stringify({ items, source: "csv_parser", count: items.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PDF, XLSX, XLS, TXT: send to AI for extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let contentForAI: any[];

    if (fileName.endsWith(".txt")) {
      const text = new TextDecoder().decode(fileBytes!);
      contentForAI = [{ type: "text", text: `Extract inventory items from this document:\n\n${text}` }];
    } else {
      const base64 = btoa(String.fromCharCode(...fileBytes!));
      const mimeType = fileName.endsWith(".pdf") ? "application/pdf"
        : fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : fileName.endsWith(".xls") ? "application/vnd.ms-excel"
        : "application/octet-stream";

      contentForAI = [
        {
          type: "file",
          file: { filename: fileName, file_data: `data:${mimeType};base64,${base64}` },
        },
        { type: "text", text: "Extract all inventory items from this document." },
      ];
    }

  const systemPrompt = `You are an inventory document parser. Extract every inventory item AND the vendor/supplier information from the uploaded document (BOL, packing list, invoice, spreadsheet, etc.).

Return data by calling the extract_inventory_items tool. For each item extract:
- name (required)
- sku (if available)
- gtin / barcode (if available)
- category (best guess from: Coffee, Dairy, Pastry, Supplies, Food, Beverage, Meat, Seafood, Produce, Dry Goods, Packaging)
- quantity (numeric, default 0)
- unit_of_measure (e.g. units, lbs, cases, gallons)
- cost_per_unit (numeric, default 0)

Also extract the vendor/supplier information from the document header, sender, or letterhead:
- vendor_name (company name of the sender/supplier)
- vendor_contact (contact person name if available)
- vendor_phone (phone number if available)
- vendor_email (email address if available)

If a field is missing, use empty string or 0 as appropriate.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentForAI },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_inventory_items",
            description: "Return extracted inventory items from the document",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      sku: { type: "string" },
                      gtin: { type: "string" },
                      category: { type: "string" },
                      quantity: { type: "number" },
                      unit_of_measure: { type: "string" },
                      cost_per_unit: { type: "number" },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
                vendor: {
                  type: "object",
                  properties: {
                    vendor_name: { type: "string" },
                    vendor_contact: { type: "string" },
                    vendor_phone: { type: "string" },
                    vendor_email: { type: "string" },
                  },
                  required: ["vendor_name"],
                  additionalProperties: false,
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_inventory_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI extraction failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const parsed = JSON.parse(toolCall.function.arguments);
    const items = (parsed.items || []).filter((i: any) => i.name);
    const vendor = parsed.vendor && parsed.vendor.vendor_name ? parsed.vendor : null;

    return new Response(JSON.stringify({ items, vendor, source: "ai_extraction", count: items.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-inventory-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
