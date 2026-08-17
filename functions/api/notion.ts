interface Env {
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json();
    const apiKey = context.env.NOTION_API_KEY;
    const dbId = context.env.NOTION_DATABASE_ID || "3bb634ee8c2a80f79d31c704a9d5281e";

    // Fallback/Mock Mode if API key is not provided
    if (!apiKey) {
      console.warn("NOTION_API_KEY is not configured. Returning mock success response.");
      const mockTrackingCode = Math.floor(1000 + Math.random() * 9000);
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          message: "Mock Notion record created successfully.",
          orderId: data.orderId,
          trackingCode: mockTrackingCode,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { orderId, customer, items, total, paymentMethod } = data;
    const itemsSummary = items
      .map((item: any) => `${item.name} (${item.quantity}x)`)
      .join(", ");

    // A. Query database to find the latest tracking code and increment it
    let trackingCode = 1001;
    try {
      const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
        }),
      });

      if (queryRes.ok) {
        const queryData: any = await queryRes.json();
        const results = queryData.results || [];
        let maxVal = 1000;
        for (const page of results) {
          const props = page.properties || {};
          let val = 0;
          // Check for a Tracking Code column
          const trackKey = Object.keys(props).find(
            (k) =>
              k.toLowerCase().replace(/[\s_-]/g, "") === "trackingcode" ||
              k.toLowerCase().replace(/[\s_-]/g, "") === "tracking" ||
              k.toLowerCase().replace(/[\s_-]/g, "") === "code"
          );
          if (trackKey) {
            const p = props[trackKey];
            if (p.type === "number") {
              val = p.number || 0;
            } else if (p.type === "rich_text") {
              const txt = p.rich_text?.[0]?.text?.content || "";
              val = parseInt(txt) || 0;
            }
          } else {
            // Check in title
            const titleKey = Object.keys(props).find((k) => props[k].type === "title");
            if (titleKey) {
              const titleText = props[titleKey].title?.[0]?.text?.content || "";
              const match = titleText.match(/\b(1\d{3}|[2-9]\d{3})\b/);
              if (match) {
                val = parseInt(match[0]) || 0;
              }
            }
          }
          if (val > maxVal && val < 10000) {
            maxVal = val;
          }
        }
        trackingCode = maxVal + 1;
      }
    } catch (err) {
      console.error("Error querying latest tracking code from Notion:", err);
    }

    // 1. Fetch Database schema to see what columns exist
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

    // 2. Build Notion properties object dynamically
    const properties: any = {};

    // Helper: Find property key that matches a name (case-insensitive) or type
    const findPropKey = (name: string, type?: string) => {
      const keys = Object.keys(dbProperties);
      const matchByName = keys.find((k) => k.toLowerCase().replace(/[\s_-]/g, "") === name.toLowerCase().replace(/[\s_-]/g, ""));
      if (matchByName) return matchByName;
      if (type) {
        return keys.find((k) => dbProperties[k].type === type);
      }
      return null;
    };

    // Notion database MUST have a title property. Let's find it.
    const titleKey = findPropKey("title", "title") || findPropKey("name", "title") || Object.keys(dbProperties).find((k) => dbProperties[k].type === "title") || "Name";

    // Set Title property
    properties[titleKey] = {
      title: [
        {
          text: {
            content: `Order #${trackingCode} (BEE-${orderId.slice(-6)})`,
          },
        },
      ],
    };

    // Safely add other properties if they exist in schema
    const customerKey = findPropKey("customername") || findPropKey("customer");
    if (customerKey && dbProperties[customerKey]?.type === "rich_text") {
      properties[customerKey] = {
        rich_text: [{ text: { content: `${customer.firstName} ${customer.lastName}` } }],
      };
    }

    const phoneKey = findPropKey("phone") || findPropKey("phonenumber");
    if (phoneKey) {
      if (dbProperties[phoneKey]?.type === "phone_number") {
        properties[phoneKey] = { phone_number: customer.phone };
      } else if (dbProperties[phoneKey]?.type === "rich_text") {
        properties[phoneKey] = { rich_text: [{ text: { content: customer.phone } }] };
      }
    }

    const addressKey = findPropKey("address") || findPropKey("deliveryaddress");
    if (addressKey && dbProperties[addressKey]?.type === "rich_text") {
      properties[addressKey] = {
        rich_text: [{ text: { content: `${customer.address} (${customer.shippingZone})` } }],
      };
    }

    const itemsKey = findPropKey("items") || findPropKey("products");
    if (itemsKey && dbProperties[itemsKey]?.type === "rich_text") {
      properties[itemsKey] = {
        rich_text: [{ text: { content: itemsSummary } }],
      };
    }

    const totalKey = findPropKey("total") || findPropKey("totalamount") || findPropKey("amount");
    if (totalKey) {
      if (dbProperties[totalKey]?.type === "number") {
        properties[totalKey] = { number: total };
      } else if (totalKey && dbProperties[totalKey]?.type === "rich_text") {
        properties[totalKey] = { rich_text: [{ text: { content: `${total} GEL` } }] };
      }
    }

    const paymentKey = findPropKey("paymentmethod") || findPropKey("payment");
    if (paymentKey) {
      const type = dbProperties[paymentKey]?.type;
      if (type === "select") {
        properties[paymentKey] = { select: { name: paymentMethod } };
      } else if (type === "rich_text") {
        properties[paymentKey] = { rich_text: [{ text: { content: paymentMethod } }] };
      }
    }

    // Set Tracking Code property
    const trackingKey = findPropKey("trackingcode") || findPropKey("tracking") || findPropKey("code");
    if (trackingKey) {
      if (dbProperties[trackingKey]?.type === "number") {
        properties[trackingKey] = { number: trackingCode };
      } else if (dbProperties[trackingKey]?.type === "rich_text") {
        properties[trackingKey] = { rich_text: [{ text: { content: String(trackingCode) } }] };
      }
    }

    // 3. Make the creation request to Notion API
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });

    const _createData = await createRes.json();
    if (!createRes.ok) {
      // If schema mapping failed, attempt absolute minimum fallback (just Title)
      console.warn("Detailed schema mapping failed. Attempting minimum fallback title-only record.");
      const fallbackRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            [titleKey]: {
              title: [
                {
                  text: {
                    content: `Order #${trackingCode} - ${customer.firstName} - ${total} GEL - ${itemsSummary}`,
                  },
                },
              ],
            },
          },
        }),
      });

      if (!fallbackRes.ok) {
        const errText = await fallbackRes.text();
        throw new Error(`Notion API failure: ${errText}`);
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Order logged in Notion", trackingCode }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Notion integration endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
