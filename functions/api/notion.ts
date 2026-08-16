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
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          message: "Mock Notion record created successfully.",
          orderId: data.orderId,
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
            content: `Order #${orderId}`,
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
      } else if (dbProperties[totalKey]?.type === "rich_text") {
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

    const createData = await createRes.json();
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
                    content: `Order #${orderId} - ${customer.firstName} - ${total} GEL - ${itemsSummary}`,
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

    return new Response(JSON.stringify({ success: true, message: "Order logged in Notion" }), {
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
