interface Env {
  BOG_CLIENT_ID?: string;
  BOG_SECRET_KEY?: string;
  ENV_MODE?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json();
    const { orderId, amount, description } = data;
    
    const clientId = context.env.BOG_CLIENT_ID;
    const secretKey = context.env.BOG_SECRET_KEY;
    const isSandbox = context.env.ENV_MODE !== "production";

    // Extract local request origin to construct redirect back URLs
    const requestUrl = new URL(context.request.url);
    const origin = requestUrl.origin;

    // Fallback/Mock Mode if credentials are not configured
    if (!clientId || !secretKey) {
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

    // Set BOG Endpoints based on sandbox mode
    const authUrl = isSandbox
      ? "https://oauth2-sandbox.bog.ge/auth/realms/bog/protocol/openid-connect/token"
      : "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

    const paymentUrl = isSandbox
      ? "https://api-sandbox.bog.ge/payments/v1/pre-orders"
      : "https://api.bog.ge/payments/v1/pre-orders";

    // 1. Authenticate with BOG (OAuth2 Client Credentials)
    const basicAuth = btoa(`${clientId}:${secretKey}`);
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "BOG Auth failed");
    }

    const accessToken = tokenData.access_token;

    // 2. Create BOG Pre-order
    const preOrderPayload = {
      callback_url: `${origin}/api/bog-callback`,
      description: description || "Beenaturals Honey Order",
      external_order_id: orderId,
      purchase_units: {
        currency: "GEL",
        total_amount: Number(amount),
      },
      ttl: 15,
      // BOG also supports redirect_url on some products. Let's include redirect parameters if needed:
      redirect_url: `${origin}/?payment=success`,
    };

    const preOrderRes = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka", // Force Georgian language interface
      },
      body: JSON.stringify(preOrderPayload),
    });

    const preOrderData: any = await preOrderRes.json();
    if (!preOrderRes.ok) {
      throw new Error(preOrderData.message || preOrderData.error || "BOG Pre-order creation failed");
    }

    // 3. Return payment link
    const redirectUrl = preOrderData._links?.payment_link?.href;
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
