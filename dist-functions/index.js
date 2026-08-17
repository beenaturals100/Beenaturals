var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/bog-checkout.ts
var onRequestPost = /* @__PURE__ */ __name(async (context) => {
  try {
    const data = await context.request.json();
    const { orderId, amount, description } = data;
    const clientId = context.env.BOG_CLIENT_ID;
    const secretKey = context.env.BOG_SECRET_KEY;
    const isSandbox = context.env.ENV_MODE !== "production";
    const requestUrl = new URL(context.request.url);
    const origin = requestUrl.origin;
    if (!clientId || !secretKey) {
      console.warn("BOG payment credentials are not configured. Returning mock success callback redirect.");
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          // Return local URL that completes checkout successfully after BOG simulation
          redirectUrl: `${origin}/?payment=success`
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const authUrl = isSandbox ? "https://oauth2-sandbox.bog.ge/auth/realms/bog/protocol/openid-connect/token" : "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
    const paymentUrl = isSandbox ? "https://api-sandbox.bog.ge/payments/v1/pre-orders" : "https://api.bog.ge/payments/v1/pre-orders";
    const basicAuth = btoa(`${clientId}:${secretKey}`);
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "BOG Auth failed");
    }
    const accessToken = tokenData.access_token;
    const preOrderPayload = {
      callback_url: `${origin}/api/bog-callback`,
      description: description || "Beenaturals Honey Order",
      external_order_id: orderId,
      purchase_units: {
        currency: "GEL",
        total_amount: Number(amount)
      },
      ttl: 15,
      // BOG also supports redirect_url on some products. Let's include redirect parameters if needed:
      redirect_url: `${origin}/?payment=success`
    };
    const preOrderRes = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka"
        // Force Georgian language interface
      },
      body: JSON.stringify(preOrderPayload)
    });
    const preOrderData = await preOrderRes.json();
    if (!preOrderRes.ok) {
      throw new Error(preOrderData.message || preOrderData.error || "BOG Pre-order creation failed");
    }
    const redirectUrl = preOrderData._links?.payment_link?.href;
    if (!redirectUrl) {
      throw new Error("No redirect link found in BOG response");
    }
    return new Response(JSON.stringify({ success: true, redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("BOG Checkout endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/checkout.ts
var onRequestPost2 = /* @__PURE__ */ __name(async (context) => {
  try {
    const data = await context.request.json();
    const { orderId, amount, description } = data;
    const clientId = context.env.BOG_CLIENT_ID;
    const secretKey = context.env.BOG_SECRET_KEY;
    const requestUrl = new URL(context.request.url);
    const origin = requestUrl.origin;
    if (!clientId || !secretKey) {
      console.warn("BOG credentials not configured. Returning direct redirect to success page for local mock.");
      return new Response(
        JSON.stringify({
          success: true,
          redirectUrl: `${origin}/?payment=success`
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const authUrl = "https://oauth2.bog.ge/oauth2/token";
    const paymentUrl = "https://ecommerce.ipay.ge/api/v1/checkout/orders";
    const basicAuth = btoa(`${clientId}:${secretKey}`);
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "BOG iPay Auth failed");
    }
    const accessToken = tokenData.access_token;
    const checkoutPayload = {
      intent: "CAPTURE",
      items: [
        {
          amount: Number(amount).toFixed(2),
          description: description || `Beenaturals Honey Order #${orderId}`,
          quantity: "1",
          product_id: orderId
        }
      ],
      locale: "ka",
      shop_order_id: orderId,
      redirect_url: `${origin}/?payment=success`,
      show_shop_order_id_on_extract: true,
      capture_method: "AUTOMATIC"
    };
    const preOrderRes = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(checkoutPayload)
    });
    const preOrderData = await preOrderRes.json();
    if (!preOrderRes.ok) {
      throw new Error(preOrderData.message || preOrderData.error || "BOG iPay Order creation failed");
    }
    let redirectUrl = "";
    if (preOrderData.redirect_url) {
      redirectUrl = preOrderData.redirect_url;
    } else if (Array.isArray(preOrderData.links)) {
      const redirectLink = preOrderData.links.find(
        (l) => l.rel === "redirect" || l.method === "GET" && l.href?.includes("payment_hash=")
      );
      if (redirectLink) {
        redirectUrl = redirectLink.href;
      }
    }
    if (!redirectUrl && preOrderData.payment_hash) {
      redirectUrl = `https://ipay.ge/pay?payment_hash=${preOrderData.payment_hash}`;
    }
    if (!redirectUrl) {
      throw new Error("No redirect link found in BOG response");
    }
    return new Response(JSON.stringify({ success: true, redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("BOG iPay Checkout endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/notion.ts
var onRequestPost3 = /* @__PURE__ */ __name(async (context) => {
  try {
    const data = await context.request.json();
    const apiKey = context.env.NOTION_API_KEY;
    const dbId = context.env.NOTION_DATABASE_ID || "3bb634ee8c2a80f79d31c704a9d5281e";
    if (!apiKey) {
      console.warn("NOTION_API_KEY is not configured. Returning mock success response.");
      const mockTrackingCode = Math.floor(1e3 + Math.random() * 9e3);
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          message: "Mock Notion record created successfully.",
          orderId: data.orderId,
          trackingCode: mockTrackingCode
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { orderId, customer, items, total, paymentMethod } = data;
    const itemsSummary = items.map((item) => `${item.name} (${item.quantity}x)`).join(", ");
    let trackingCode = 1001;
    try {
      const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          page_size: 100
        })
      });
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        const results = queryData.results || [];
        let maxVal = 1e3;
        for (const page of results) {
          const props = page.properties || {};
          let val = 0;
          const trackKey = Object.keys(props).find(
            (k) => k.toLowerCase().replace(/[\s_-]/g, "") === "trackingcode" || k.toLowerCase().replace(/[\s_-]/g, "") === "tracking" || k.toLowerCase().replace(/[\s_-]/g, "") === "code"
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
            const titleKey2 = Object.keys(props).find((k) => props[k].type === "title");
            if (titleKey2) {
              const titleText = props[titleKey2].title?.[0]?.text?.content || "";
              const match2 = titleText.match(/\b(1\d{3}|[2-9]\d{3})\b/);
              if (match2) {
                val = parseInt(match2[0]) || 0;
              }
            }
          }
          if (val > maxVal && val < 1e4) {
            maxVal = val;
          }
        }
        trackingCode = maxVal + 1;
      }
    } catch (err) {
      console.error("Error querying latest tracking code from Notion:", err);
    }
    const dbSchemaRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28"
      }
    });
    let dbProperties = {};
    if (dbSchemaRes.ok) {
      const dbInfo = await dbSchemaRes.json();
      dbProperties = dbInfo.properties || {};
    }
    const properties = {};
    const findPropKey = /* @__PURE__ */ __name((name, type) => {
      const keys = Object.keys(dbProperties);
      const matchByName = keys.find((k) => k.toLowerCase().replace(/[\s_-]/g, "") === name.toLowerCase().replace(/[\s_-]/g, ""));
      if (matchByName) return matchByName;
      if (type) {
        return keys.find((k) => dbProperties[k].type === type);
      }
      return null;
    }, "findPropKey");
    const titleKey = findPropKey("title", "title") || findPropKey("name", "title") || Object.keys(dbProperties).find((k) => dbProperties[k].type === "title") || "Name";
    properties[titleKey] = {
      title: [
        {
          text: {
            content: `Order #${trackingCode} (BEE-${orderId.slice(-6)})`
          }
        }
      ]
    };
    const customerKey = findPropKey("customername") || findPropKey("customer");
    if (customerKey && dbProperties[customerKey]?.type === "rich_text") {
      properties[customerKey] = {
        rich_text: [{ text: { content: `${customer.firstName} ${customer.lastName}` } }]
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
        rich_text: [{ text: { content: `${customer.address} (${customer.shippingZone})` } }]
      };
    }
    const itemsKey = findPropKey("items") || findPropKey("products");
    if (itemsKey && dbProperties[itemsKey]?.type === "rich_text") {
      properties[itemsKey] = {
        rich_text: [{ text: { content: itemsSummary } }]
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
    const trackingKey = findPropKey("trackingcode") || findPropKey("tracking") || findPropKey("code");
    if (trackingKey) {
      if (dbProperties[trackingKey]?.type === "number") {
        properties[trackingKey] = { number: trackingCode };
      } else if (dbProperties[trackingKey]?.type === "rich_text") {
        properties[trackingKey] = { rich_text: [{ text: { content: String(trackingCode) } }] };
      }
    }
    const paymentStatusValue = paymentMethod === "card" ? "\u10D2\u10D0\u10D3\u10D0\u10EE\u10D3\u10D8\u10DA\u10D8" : "\u10D2\u10D0\u10D3\u10D0\u10E3\u10EE\u10D3\u10D4\u10DA\u10D8";
    const paymentStatusKey = findPropKey("paymentstatus") || findPropKey("payment_status") || "Payment Status";
    if (paymentStatusKey) {
      if (dbProperties[paymentStatusKey]?.type === "select" || !dbProperties[paymentStatusKey]) {
        properties[paymentStatusKey] = { select: { name: paymentStatusValue } };
      } else if (dbProperties[paymentStatusKey]?.type === "rich_text") {
        properties[paymentStatusKey] = { rich_text: [{ text: { content: paymentStatusValue } }] };
      }
    }
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties
      })
    });
    const _createData = await createRes.json();
    if (!createRes.ok) {
      console.warn("Detailed schema mapping failed. Attempting minimum fallback title-only record.");
      const fallbackRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            [titleKey]: {
              title: [
                {
                  text: {
                    content: `Order #${trackingCode} - ${customer.firstName} - ${total} GEL - ${itemsSummary}`
                  }
                }
              ]
            }
          }
        })
      });
      if (!fallbackRes.ok) {
        const errText = await fallbackRes.text();
        throw new Error(`Notion API failure: ${errText}`);
      }
    }
    return new Response(JSON.stringify({ success: true, message: "Order logged in Notion", trackingCode }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Notion integration endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/resend.ts
var onRequestPost4 = /* @__PURE__ */ __name(async (context) => {
  try {
    const data = await context.request.json();
    const apiKey = context.env.RESEND_API_KEY;
    const recipientEmail = "beenaturals100@gmail.com";
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured. Returning mock success response.");
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          message: "Mock order email sent successfully.",
          recipient: recipientEmail
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { orderId, customer, items, subtotal, total, paymentMethod } = data;
    const itemsHtml = items.map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f0ea;">
        <td style="padding: 12px 8px; font-weight: bold; color: #292524;">${item.name}</td>
        <td style="padding: 12px 8px; color: #57534e; text-align: center;">${item.weight}</td>
        <td style="padding: 12px 8px; color: #57534e; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; font-weight: bold; color: #92400e; text-align: right;">${item.price * item.quantity} GEL</td>
      </tr>`
    ).join("");
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>\u10D0\u10EE\u10D0\u10DA\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 - Beenaturals</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fffdf5; padding: 20px; margin: 0; color: #292524;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fef3c7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #d97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Beenaturals \u2022 \u10D1\u10D8\u10DC\u10D0\u10E2\u10E3\u10E0\u10D0\u10DA\u10E1</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 14px;">\u10D0\u10EE\u10D0\u10DA\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8\u10D0! (#${orderId})</p>
        </div>
        
        <!-- Customer Info -->
        <div style="padding: 24px;">
          <h2 style="font-size: 16px; border-bottom: 2px solid #fcd34d; padding-bottom: 8px; color: #78350f; margin-top: 0;">\u10DB\u10D8\u10DB\u10E6\u10D4\u10D1\u10D8\u10E1 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0</h2>
          <table style="width: 100%; font-size: 14px; line-height: 1.6;">
            <tr>
              <td style="width: 120px; font-weight: bold; color: #57534e; padding: 4px 0;">\u10E1\u10D0\u10EE\u10D4\u10DA\u10D8, \u10D2\u10D5\u10D0\u10E0\u10D8:</td>
              <td style="color: #292524; padding: 4px 0;">${customer.firstName} ${customer.lastName}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #57534e; padding: 4px 0;">\u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8:</td>
              <td style="color: #292524; padding: 4px 0;">${customer.address} (${customer.shippingZone})</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #57534e; padding: 4px 0;">\u10E2\u10D4\u10DA\u10D4\u10E4\u10DD\u10DC\u10D8:</td>
              <td style="color: #292524; padding: 4px 0;">${customer.phone}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #57534e; padding: 4px 0;">\u10D2\u10D0\u10D3\u10D0\u10EE\u10D3\u10D0:</td>
              <td style="color: #292524; padding: 4px 0; font-weight: bold;">${paymentMethod === "cash" ? "\u10D9\u10E3\u10E0\u10D8\u10D4\u10E0\u10D7\u10D0\u10DC \u10D2\u10D0\u10D3\u10D0\u10EE\u10D3\u10D0 (\u10DC\u10D0\u10E6\u10D3\u10D8)" : "\u10D1\u10D0\u10E0\u10D0\u10D7\u10D8\u10D7 \u10D2\u10D0\u10D3\u10D0\u10EE\u10D3\u10D0 (BOG)"}</td>
            </tr>
          </table>

          <!-- Items Table -->
          <h2 style="font-size: 16px; border-bottom: 2px solid #fcd34d; padding-bottom: 8px; color: #78350f; margin-top: 24px;">\u10DE\u10E0\u10DD\u10D3\u10E3\u10E5\u10EA\u10D8\u10D0</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #fff9db; border-bottom: 1px solid #fde68a;">
                <th style="padding: 10px 8px; text-align: left; color: #78350f;">\u10DE\u10E0\u10DD\u10D3\u10E3\u10E5\u10E2\u10D8</th>
                <th style="padding: 10px 8px; text-align: center; color: #78350f;">\u10EC\u10DD\u10DC\u10D0</th>
                <th style="padding: 10px 8px; text-align: center; color: #78350f;">\u10E0\u10D0\u10DD\u10D3.</th>
                <th style="padding: 10px 8px; text-align: right; color: #78350f;">\u10E4\u10D0\u10E1\u10D8</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Summary -->
          <div style="margin-top: 20px; padding: 16px; background-color: #fffdf5; border: 1px solid #fef3c7; border-radius: 12px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #57534e;">\u10DE\u10E0\u10DD\u10D3\u10E3\u10E5\u10EA\u10D8\u10D0:</span>
              <span style="font-weight: bold; color: #292524; margin-left: auto;">${subtotal} GEL</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #57534e;">\u10E2\u10E0\u10D0\u10DC\u10E1\u10DE\u10DD\u10E0\u10E2\u10D8\u10E0\u10D4\u10D1\u10D0:</span>
              <span style="font-weight: bold; color: #292524; margin-left: auto;">+${customer.shippingFee} GEL</span>
            </div>
            <hr style="border: 0; border-top: 1px solid #fcd34d; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
              <span style="color: #78350f;">\u10E1\u10E3\u10DA \u10D2\u10D0\u10D3\u10D0\u10E1\u10D0\u10EE\u10D3\u10D4\u10DA\u10D8:</span>
              <span style="color: #92400e; margin-left: auto;">${total} GEL</span>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #fffbeb; padding: 16px; text-align: center; font-size: 12px; color: #78350f; border-top: 1px solid #fef3c7;">
          Beenaturals Store - \u10E1\u10E0\u10E3\u10DA\u10D8\u10D0\u10D3 \u10DC\u10D0\u10E2\u10E3\u10E0\u10D0\u10DA\u10E3\u10E0\u10D8 \u10DB\u10D4\u10E4\u10E3\u10E2\u10D9\u10E0\u10D4\u10DD\u10D1\u10D8\u10E1 \u10DE\u10E0\u10DD\u10D3\u10E3\u10E5\u10E2\u10D4\u10D1\u10D8
        </div>
      </div>
    </body>
    </html>
    `;
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Beenaturals Orders <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `New Beenaturals Order #${orderId} - ${customer.firstName} ${customer.lastName}`,
        html: htmlContent
      })
    });
    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      const errText = JSON.stringify(resendData);
      throw new Error(`Resend API Error: ${errText}`);
    }
    return new Response(JSON.stringify({ success: true, message: "Email notification sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Resend integration endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/track.ts
var onRequestGet = /* @__PURE__ */ __name(async (context) => {
  try {
    const { searchParams } = new URL(context.request.url);
    const code = searchParams.get("code");
    if (!code || !/^\d{4}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid tracking code format. Must be 4 digits." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const apiKey = context.env.NOTION_API_KEY;
    const dbId = context.env.NOTION_DATABASE_ID || "3bb634ee8c2a80f79d31c704a9d5281e";
    if (!apiKey) {
      console.warn("NOTION_API_KEY is not configured. Returning mock tracking status.");
      let mockStage = 1;
      let mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8\u10D0";
      if (code === "1001") {
        mockStage = 1;
        mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8\u10D0";
      } else if (code === "1002") {
        mockStage = 2;
        mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10DB\u10D6\u10D0\u10D3 \u10D0\u10E0\u10D8\u10E1 \u10D2\u10D0\u10E1\u10D0\u10D2\u10D6\u10D0\u10D5\u10DC\u10D0\u10D3";
      } else if (code === "1003") {
        mockStage = 3;
        mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10D2\u10D0\u10D2\u10D6\u10D0\u10D5\u10DC\u10D8\u10DA\u10D8\u10D0, \u10D9\u10E3\u10E0\u10D8\u10D4\u10E0\u10D8 \u10DB\u10D0\u10DA\u10D4 \u10DB\u10DD\u10D2\u10D8\u10E2\u10D0\u10DC\u10D7";
      } else {
        const val = parseInt(code);
        mockStage = val % 3 + 1;
        if (mockStage === 1) mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8\u10D0";
        else if (mockStage === 2) mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10DB\u10D6\u10D0\u10D3 \u10D0\u10E0\u10D8\u10E1 \u10D2\u10D0\u10E1\u10D0\u10D2\u10D6\u10D0\u10D5\u10DC\u10D0\u10D3";
        else mockStatusName = "\u10D7\u10E5\u10D5\u10D4\u10DC\u10D8 \u10E8\u10D4\u10D9\u10D5\u10D4\u10D7\u10D0 \u10D2\u10D0\u10D2\u10D6\u10D0\u10D5\u10DC\u10D8\u10DA\u10D8\u10D0, \u10D9\u10E3\u10E0\u10D8\u10D4\u10E0\u10D8 \u10DB\u10D0\u10DA\u10D4 \u10DB\u10DD\u10D2\u10D8\u10E2\u10D0\u10DC\u10D7";
      }
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          trackingCode: code,
          statusName: mockStatusName,
          stage: mockStage
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    let matchedPage = null;
    try {
      const filterBody = {
        filter: {
          or: [
            {
              property: "Tracking Code",
              number: {
                equals: parseInt(code)
              }
            },
            {
              property: "Tracking Code",
              rich_text: {
                equals: code
              }
            },
            {
              property: "Name",
              title: {
                contains: code
              }
            }
          ]
        }
      };
      const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(filterBody)
      });
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (queryData.results && queryData.results.length > 0) {
          matchedPage = queryData.results[0];
        }
      }
    } catch (err) {
      console.error("Filter query to Notion failed:", err);
    }
    if (!matchedPage) {
      try {
        const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ page_size: 100 })
        });
        if (queryRes.ok) {
          const queryData = await queryRes.json();
          const results = queryData.results || [];
          for (const page of results) {
            const props = page.properties || {};
            const titleKey = Object.keys(props).find((k) => props[k].type === "title");
            if (titleKey) {
              const titleText = props[titleKey].title?.[0]?.text?.content || "";
              if (titleText.includes(code)) {
                matchedPage = page;
                break;
              }
            }
            const trackKey = Object.keys(props).find(
              (k) => k.toLowerCase().replace(/[\s_-]/g, "") === "trackingcode" || k.toLowerCase().replace(/[\s_-]/g, "") === "tracking" || k.toLowerCase().replace(/[\s_-]/g, "") === "code"
            );
            if (trackKey) {
              const p = props[trackKey];
              let pVal = "";
              if (p.type === "number") {
                pVal = String(p.number || "");
              } else if (p.type === "rich_text") {
                pVal = p.rich_text?.[0]?.text?.content || "";
              }
              if (pVal === code) {
                matchedPage = page;
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error("Fallback scan of Notion database failed:", err);
      }
    }
    if (!matchedPage) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const statusName = matchedPage.properties["Delivery Status"]?.select?.name || matchedPage.properties["Delivery Status"]?.status?.name || "";
    let stage = 1;
    const lowerStatus = statusName.toLowerCase();
    if (statusName.includes("\u10D2\u10D0\u10D2\u10D6\u10D0\u10D5\u10DC\u10D8\u10DA\u10D8\u10D0") || lowerStatus.includes("shipped") || lowerStatus.includes("delivered") || lowerStatus.includes("transit") || lowerStatus.includes("\u10D9\u10E3\u10E0\u10D8\u10D4\u10E0") || lowerStatus.includes("done") || lowerStatus.includes("completed") || lowerStatus.includes("stage3") || lowerStatus.includes("stage 3") || lowerStatus.includes("stage_3")) {
      stage = 3;
    } else if (statusName.includes("\u10DB\u10D6\u10D0\u10D3 \u10D0\u10E0\u10D8\u10E1") || lowerStatus.includes("ready") || lowerStatus.includes("in progress") || lowerStatus.includes("doing") || lowerStatus.includes("prepared") || lowerStatus.includes("pack") || lowerStatus.includes("stage2") || lowerStatus.includes("stage 2") || lowerStatus.includes("stage_2")) {
      stage = 2;
    } else {
      stage = 1;
    }
    return new Response(
      JSON.stringify({
        success: true,
        trackingCode: code,
        statusName: statusName || "Default",
        stage
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Tracking endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// ../.wrangler/tmp/pages-tWLrBm/functionsRoutes-0.18002459932785042.mjs
var routes = [
  {
    routePath: "/api/bog-checkout",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/checkout",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/notion",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/resend",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/track",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  }
];

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
