interface Env {
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;
  RESEND_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    let payload: any = {};
    try {
      payload = await context.request.json();
      console.log("BOG Webhook callback payload received:", JSON.stringify(payload));
    } catch (e) {
      console.warn("BOG Webhook did not send a JSON payload:", e);
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = payload.body || {};
    const status = body.status;
    const shopOrderId = body.shop_order_id; // e.g. BEE-xxxxxx

    // BOG payment success status values can be "completed", "success", "COMPLETED", or "SUCCESS"
    const isSuccess =
      status === "completed" ||
      status === "success" ||
      status === "COMPLETED" ||
      status === "SUCCESS";

    if (!isSuccess || !shopOrderId) {
      console.log(`BOG Webhook ignored. Status: ${status}, Shop Order ID: ${shopOrderId}`);
      return new Response(JSON.stringify({ success: true, message: "Webhook received but status not successful" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Retrieve and parse base64-encoded orderData from URL query parameters
    const requestUrl = new URL(context.request.url);
    const encodedData = requestUrl.searchParams.get("data");

    if (!encodedData) {
      console.error("No order data query parameter found in BOG callback URL.");
      return new Response(JSON.stringify({ success: false, error: "Missing order data" }), {
        status: 200, // Return 200 to BOG to stop retrying
        headers: { "Content-Type": "application/json" },
      });
    }

    let orderData: any;
    try {
      const decoded = atob(encodedData);
      // Support UTF-8 characters safely during decoding
      const utf8Decoded = decodeURIComponent(
        decoded
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      orderData = JSON.parse(utf8Decoded);
    } catch (err) {
      console.error("Failed to decode orderData from callback URL query parameter:", err);
      return new Response(JSON.stringify({ success: false, error: "Invalid encoded order data" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = context.env.NOTION_API_KEY;
    const dbId = context.env.NOTION_DATABASE_ID || "3bb634ee8c2a80f79d31c704a9d5281e";
    const origin = requestUrl.origin;

    if (!apiKey) {
      console.warn("NOTION_API_KEY is not configured in webhook callback.");
      return new Response(JSON.stringify({ success: true, message: "Mock success (no API key)" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Fetch Database schema to know property keys
    const dbSchemaRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
    });

    let dbProperties: any = {};
    if (dbSchemaRes.ok) {
      const dbInfo: any = await dbSchemaRes.json();
      dbProperties = dbInfo.properties || {};
    }

    const findPropKey = (name: string, type?: string) => {
      const keys = Object.keys(dbProperties);
      const matchByName = keys.find((k) => k.toLowerCase().replace(/[\s_-]/g, "") === name.toLowerCase().replace(/[\s_-]/g, ""));
      if (matchByName) return matchByName;
      if (type) {
        return keys.find((k) => dbProperties[k].type === type);
      }
      return null;
    };

    const titleKey = findPropKey("title", "title") || "Name";
    const paymentStatusKey = findPropKey("paymentstatus") || "Payment Status";

    // 2. Query Notion to find the page for this order
    const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: titleKey,
          title: {
            contains: shopOrderId.slice(-6)
          }
        }
      }),
    });

    if (!queryRes.ok) {
      const errText = await queryRes.text();
      throw new Error(`Failed to query Notion: ${errText}`);
    }

    const queryData: any = await queryRes.json();
    const results = queryData.results || [];
    const pageExists = results.length > 0;

    if (pageExists) {
      const page = results[0];
      const pageId = page.id;
      const props = page.properties || {};

      // 3. Check payment status to prevent duplicate processing
      let currentStatus = "";
      if (props[paymentStatusKey]) {
        const p = props[paymentStatusKey];
        if (p.type === "select") {
          currentStatus = p.select?.name || "";
        } else if (p.type === "rich_text") {
          currentStatus = p.rich_text?.[0]?.text?.content || "";
        }
      }

      if (currentStatus === "გადახდილი") {
        console.log(`Order ${shopOrderId} is already processed as paid.`);
        return new Response(JSON.stringify({ success: true, message: "Order already processed" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 4. Update status to "გადახდილი" in Notion
      const updateProperties: any = {};
      if (dbProperties[paymentStatusKey]?.type === "select" || !dbProperties[paymentStatusKey]) {
        updateProperties[paymentStatusKey] = { select: { name: "გადახდილი" } };
      } else if (dbProperties[paymentStatusKey]?.type === "rich_text") {
        updateProperties[paymentStatusKey] = { rich_text: [{ text: { content: "გადახდილი" } }] };
      }

      const updateRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: updateProperties
        }),
      });

      if (!updateRes.ok) {
        console.error("Failed to update Notion payment status in webhook callback.");
      }
    } else {
      // 5. Create new page in Notion using parsed orderData
      console.log(`Creating new Notion page via webhook for order: ${shopOrderId}`);
      const notionRes = await fetch(`${origin}/api/notion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          paymentStatus: "გადახდილი" // Set payment status to Paid
        }),
      });

      if (!notionRes.ok) {
        const errText = await notionRes.text();
        console.error(`Notion webhook logging failed: ${errText}`);
      }
    }

    // 6. Trigger order confirmation email to merchant via Resend
    console.log(`Triggering email notification via webhook for order: ${shopOrderId}`);
    const resendRes = await fetch(`${origin}/api/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error(`Resend webhook notification failed: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Order processed and logged" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("BOG Webhook callback processing error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Always return 200 to stop BOG retry loop
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const onRequestGet: PagesFunction = async (_context) => {
  return new Response(
    JSON.stringify({
      success: true,
      message: "BOG callback endpoint is active.",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
