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

    if (status !== "success" || !shopOrderId) {
      console.log(`BOG Webhook ignored. Status: ${status}, Shop Order ID: ${shopOrderId}`);
      return new Response(JSON.stringify({ success: true, message: "Webhook received but no action required" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = context.env.NOTION_API_KEY;
    const dbId = context.env.NOTION_DATABASE_ID || "3bb634ee8c2a80f79d31c704a9d5281e";

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
    const customerKey = findPropKey("customername") || findPropKey("customer") || "Customer Name";
    const phoneKey = findPropKey("phone") || findPropKey("phonenumber") || "Phone";
    const addressKey = findPropKey("address") || findPropKey("deliveryaddress") || "Address";
    const itemsKey = findPropKey("items") || findPropKey("products") || "Items";
    const totalKey = findPropKey("total") || findPropKey("totalamount") || findPropKey("amount") || "Total";

    // 2. Query Notion to find the page for this order
    // Search by matching the shopOrderId in the Title property
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

    if (results.length === 0) {
      console.warn(`No Notion page found for order ID: ${shopOrderId}`);
      return new Response(JSON.stringify({ success: false, error: "Order not found in Notion" }), {
        status: 200, // Return 200 to BOG even on no match to stop retries
        headers: { "Content-Type": "application/json" },
      });
    }

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

    // 5. Send order notification email via Resend
    const resendApiKey = context.env.RESEND_API_KEY;
    if (resendApiKey) {
      // Extract details from Notion page properties
      const customerName = props[customerKey]?.rich_text?.[0]?.text?.content || "ძვირფასო მომხმარებელო";
      const phone = props[phoneKey]?.phone_number || props[phoneKey]?.rich_text?.[0]?.text?.content || "";
      const addressFull = props[addressKey]?.rich_text?.[0]?.text?.content || "";
      const itemsSummary = props[itemsKey]?.rich_text?.[0]?.text?.content || "";
      
      let totalVal = 0;
      if (props[totalKey]) {
        if (props[totalKey].type === "number") {
          totalVal = props[totalKey].number || 0;
        } else if (props[totalKey].type === "rich_text") {
          totalVal = parseFloat(props[totalKey].rich_text?.[0]?.text?.content) || 0;
        }
      }

      const recipientEmail = "beenaturals100@gmail.com";
      
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ახალი შეკვეთა (გადახდილი) - Beenaturals</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fffdf5; padding: 20px; margin: 0; color: #292524;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fef3c7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: #16a34a; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Beenaturals • ბინატურალს</h1>
            <p style="color: #dcfce7; margin: 4px 0 0 0; font-size: 14px;">ონლაინ გადახდა წარმატებულია! (#${shopOrderId})</p>
          </div>
          
          <div style="padding: 24px;">
            <h2 style="font-size: 16px; border-bottom: 2px solid #bbf7d0; padding-bottom: 8px; color: #14532d; margin-top: 0;">მიმღების ინფორმაცია</h2>
            <table style="width: 100%; font-size: 14px; line-height: 1.6;">
              <tr>
                <td style="width: 120px; font-weight: bold; color: #57534e; padding: 4px 0;">მიმღები:</td>
                <td style="color: #292524; padding: 4px 0;">${customerName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #57534e; padding: 4px 0;">მისამართი:</td>
                <td style="color: #292524; padding: 4px 0;">${addressFull}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #57534e; padding: 4px 0;">ტელეფონი:</td>
                <td style="color: #292524; padding: 4px 0;">${phone}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #57534e; padding: 4px 0;">გადახდა:</td>
                <td style="color: #16a34a; padding: 4px 0; font-weight: bold;">ბარათით გადახდა (გადახდილია)</td>
              </tr>
            </table>

            <h2 style="font-size: 16px; border-bottom: 2px solid #bbf7d0; padding-bottom: 8px; color: #14532d; margin-top: 24px;">პროდუქცია</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #292524;">
              ${itemsSummary}
            </p>

            <div style="margin-top: 20px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; font-size: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                <span style="color: #14532d;">სულ გადახდილი:</span>
                <span style="color: #16a34a; margin-left: auto;">${totalVal} GEL</span>
              </div>
            </div>
          </div>
          
          <div style="background-color: #f0fdf4; padding: 16px; text-align: center; font-size: 12px; color: #14532d; border-top: 1px solid #bbf7d0;">
            Beenaturals Store - შეკვეთა წარმატებით განხორციელდა
          </div>
        </div>
      </body>
      </html>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Beenaturals Orders <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: `✅ Paid BOG Order #${shopOrderId} - ${customerName}`,
          html: htmlContent,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook processed, payment status updated" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("BOG Webhook callback error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Return 200 even on error to stop BOG retrying
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
