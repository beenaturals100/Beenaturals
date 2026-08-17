interface Env {
  BOG_CLIENT_ID?: string;
  BOG_SECRET_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json();
    const { orderId, amount, description } = data;
    
    const clientId = context.env.BOG_CLIENT_ID;
    const secretKey = context.env.BOG_SECRET_KEY;

    // Extract local request origin to construct redirect back URLs
    const requestUrl = new URL(context.request.url);
    const origin = requestUrl.origin;

    // If credentials are not configured, return a clear error response instead of throwing a 500
    if (!clientId || !secretKey) {
      console.warn("BOG credentials not configured. Returning error payload.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Bank of Georgia credentials (BOG_CLIENT_ID / BOG_SECRET_KEY) are not configured in environment variables. Please check your Cloudflare dashboard configuration.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Set BOG Production iPay Endpoints
    const authUrl = "https://oauth2.bog.ge/oauth2/token";
    const paymentUrl = "https://ecommerce.ipay.ge/api/v1/checkout/orders";

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
      throw new Error(tokenData.error_description || tokenData.error || "BOG iPay Auth failed");
    }

    const accessToken = tokenData.access_token;

    // 2. Create BOG iPay Order
    const checkoutPayload = {
      intent: "CAPTURE",
      items: [
        {
          amount: Number(amount).toFixed(2),
          description: description || `Beenaturals Honey Order #${orderId}`,
          quantity: "1",
          product_id: orderId,
        }
      ],
      locale: "ka",
      shop_order_id: orderId,
      redirect_url: `${origin}/?payment=success`,
      show_shop_order_id_on_extract: true,
      capture_method: "AUTOMATIC",
    };

    const preOrderRes = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const preOrderData: any = await preOrderRes.json();
    console.log("BOG Order creation response:", JSON.stringify(preOrderData));

    if (!preOrderRes.ok) {
      const errorMsg = preOrderData.message || preOrderData.error || preOrderData.error_description || JSON.stringify(preOrderData) || `HTTP status: ${preOrderRes.statusText}`;
      throw new Error(`BOG API Order creation failed: ${errorMsg}`);
    }

    // 3. Extract the redirect link dynamically checking all standard BOG response structures
    const redirectUrl = preOrderData.redirect_url || 
                        preOrderData._links?.redirect?.href || 
                        preOrderData._links?.details?.href || 
                        (Array.isArray(preOrderData.links) ? preOrderData.links.find((l: any) => l.rel === 'redirect')?.href : undefined);

    if (!redirectUrl) {
      throw new Error(`No redirect link found in BOG response. Response: ${JSON.stringify(preOrderData)}`);
    }

    return new Response(JSON.stringify({ success: true, redirectUrl, redirect_url: redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("BOG iPay Checkout endpoint error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
