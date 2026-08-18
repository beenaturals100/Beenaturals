interface Env {
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json() as any;
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

    const { orderId, customer, items, total, paymentMethod, paymentStatus } = data;
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
    const paymentStatusKey = findPropKey("paymentstatus") || findPropKey("payment_status") || "Payment Status";

    // A. Check if the order already exists in the Notion database
    let existingPageId = null;
    let trackingCode = 1001;
    let alreadyPaid = false;

    try {
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
              contains: orderId.slice(-6)
            }
          }
        }),
      });

      if (queryRes.ok) {
        const queryData: any = await queryRes.json();
        const results = queryData.results || [];
        if (results.length > 0) {
          const page = results[0];
          existingPageId = page.id;
          const props = page.properties || {};

          // Read the existing tracking code
          const trackingKey = findPropKey("trackingcode") || findPropKey("tracking") || findPropKey("code");
          if (trackingKey) {
            const p = props[trackingKey];
            if (p.type === "number") {
              trackingCode = p.number || trackingCode;
            } else if (p.type === "rich_text") {
              trackingCode = parseInt(p.rich_text?.[0]?.text?.content) || trackingCode;
            }
          }

          // Check if it's already marked as paid
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
            alreadyPaid = true;
          }
        }
      }
    } catch (err) {
      console.error("Error querying existing page from Notion:", err);
    }

    // B. If order exists, perform update
    if (existingPageId) {
      // Determine the target payment status value
      const targetStatusValue = paymentStatus || (paymentMethod === "card" ? "გადახდილი" : "გადაუხდელი");

      if (alreadyPaid && targetStatusValue === "გადახდილი") {
        console.log(`Order BEE-${orderId.slice(-6)} is already paid. Skipping update.`);
        return new Response(JSON.stringify({ success: true, message: "Order already marked as paid", trackingCode, alreadyPaid: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Perform update to the requested status
      const updateProperties: any = {};
      if (dbProperties[paymentStatusKey]?.type === "select" || !dbProperties[paymentStatusKey]) {
        updateProperties[paymentStatusKey] = { select: { name: targetStatusValue } };
      } else if (dbProperties[paymentStatusKey]?.type === "rich_text") {
        updateProperties[paymentStatusKey] = { rich_text: [{ text: { content: targetStatusValue } }] };
      }

      const updateRes = await fetch(`https://api.notion.com/v1/pages/${existingPageId}`, {
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
        const errText = await updateRes.text();
        throw new Error(`Failed to update Notion status: ${errText}`);
      }

      return new Response(JSON.stringify({ success: true, message: "Order status updated in Notion", trackingCode, alreadyPaid: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // C. If order does NOT exist, find the latest tracking code and create a new record
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
              val = parseInt(p.rich_text?.[0]?.text?.content || "") || 0;
            }
          } else {
            const tKey = Object.keys(props).find((k) => props[k].type === "title");
            if (tKey) {
              const titleText = props[tKey].title?.[0]?.text?.content || "";
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

    // 2. Build Notion properties object dynamically
    const properties: any = {};

    properties[titleKey] = {
      title: [
        {
          text: {
            content: `Order #${trackingCode} (BEE-${orderId.slice(-6)})`,
          },
        },
      ],
    };

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

    const trackingKey = findPropKey("trackingcode") || findPropKey("tracking") || findPropKey("code");
    if (trackingKey) {
      if (dbProperties[trackingKey]?.type === "number") {
        properties[trackingKey] = { number: trackingCode };
      } else if (dbProperties[trackingKey]?.type === "rich_text") {
        properties[trackingKey] = { rich_text: [{ text: { content: String(trackingCode) } }] };
      }
    }

    const paymentStatusValue = paymentStatus || (paymentMethod === "card" ? "გადახდილი" : "გადაუხდელი");
    if (paymentStatusKey) {
      if (dbProperties[paymentStatusKey]?.type === "select" || !dbProperties[paymentStatusKey]) {
        properties[paymentStatusKey] = { select: { name: paymentStatusValue } };
      } else if (dbProperties[paymentStatusKey]?.type === "rich_text") {
        properties[paymentStatusKey] = { rich_text: [{ text: { content: paymentStatusValue } }] };
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

    if (!createRes.ok) {
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

    return new Response(JSON.stringify({ success: true, message: "Order logged in Notion", trackingCode, alreadyPaid: false }), {
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
