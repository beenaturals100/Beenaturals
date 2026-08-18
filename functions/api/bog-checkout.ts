interface Env {
  BOG_CLIENT_ID?: string;
  BOG_CLIENT_SECRET?: string;
  ENV_MODE?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json() as any;
    const { orderId, amount, description } = data;
    
    const rawClientId = context.env.BOG_CLIENT_ID;
    const rawClientSecret = context.env.BOG_CLIENT_SECRET;

    const clientId = rawClientId ? rawClientId.trim().replace(/^["']|["']$/g, '') : "";
    const clientSecret = rawClientSecret ? rawClientSecret.trim().replace(/^["']|["']$/g, '') : "";
    const isSandbox = context.env.ENV_MODE !== "production";

    // Extract local request origin to construct redirect back URLs
    const requestUrl = new URL(context.request.url);
    const origin = requestUrl.origin;

    // Fallback/Mock Mode if credentials are not configured
    if (!clientId || !clientSecret) {
      console.warn("BOG payment credentials are not configured. Returning mock success callback redirect.");
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          // Return local URL that completes checkout successfully after BOG simulation
          redirectUrl: `${origin}/?payment=success`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // BOG Production Endpoints
    const authUrl = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
    const paymentUrl = "https://api.bog.ge/payments/v1/ecommerce/orders";

    // Logging for debugging credentials issues
    console.log("[BOG Checkout] Environment Mode:", context.env.ENV_MODE);
    console.log("[BOG Checkout] Is Sandbox:", isSandbox);
    console.log("[BOG Checkout] Auth URL being used:", authUrl);
    console.log("[BOG Checkout] Client ID:", `"${clientId}"`, `(Length: ${clientId.length})`);
    console.log("[BOG Checkout] Client Secret Length:", clientSecret.length);

    // 1. Authenticate with BOG (OAuth2 Client Credentials)
    const authHeader = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials"
      })
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "BOG Auth failed");
    }

    const accessToken = tokenData.access_token;

    // 2. Create BOG Ecommerce Order
    const orderPayload = {
      callback_url: `${origin}/api/bog-callback`,
      external_order_id: orderId,
      purchase_units: {
        currency: "GEL",
        total_amount: Number(amount),
      },
      redirect_urls: {
        success: `${origin}/?payment=success`,
        fail: `${origin}/?payment=failed`
      }
    };

    const orderRes = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka", // Force Georgian language interface
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData: any = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderData.message || orderData.error || "BOG Order creation failed");
    }

    // 3. Return payment link
    const redirectUrl = orderData._links?.redirect?.href || orderData._links?.payment_link?.href;
    if (!redirectUrl) {
      throw new Error("No redirect link found in BOG response");
    }

    return new Response(JSON.stringify({ success: true, redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("BOG Checkout endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
