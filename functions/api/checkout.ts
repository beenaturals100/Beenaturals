export const onRequestPost: PagesFunction<{ BOG_CLIENT_ID?: string; BOG_SECRET_KEY?: string }> = async (context) => {
  try {
    const clientId = context.env.BOG_CLIENT_ID || (typeof process !== "undefined" ? process.env.BOG_CLIENT_ID : undefined);
    const secretKey = context.env.BOG_SECRET_KEY || (typeof process !== "undefined" ? process.env.BOG_SECRET_KEY : undefined);

    if (!clientId || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Missing BOG environment secrets in Cloudflare context" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the incoming request body
    const requestData: any = await context.request.json();
    const { amount } = requestData;

    // Set BOG Endpoints
    const authUrl = "https://oauth2.bog.ge/oauth2/token";
    const orderUrl = "https://ecommerce.ipay.ge/api/v1/checkout/orders";

    // Base64 helper supporting both Node.js and Browser/Cloudflare environments
    const getBasicAuthHeader = (id: string, secret: string) => {
      if (typeof Buffer !== "undefined") {
        return "Basic " + Buffer.from(id + ":" + secret).toString("base64");
      }
      return "Basic " + btoa(id + ":" + secret);
    };

    // 1. Get OAuth2 Token
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": getBasicAuthHeader(clientId, secretKey),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "BOG Auth failed");
    }

    const accessToken = tokenData.access_token;

    // 2. Create iPay Order
    const checkoutPayload = {
      intent: "CAPTURE",
      items: [
        {
          amount: Number(amount).toFixed(2),
          description: "Beenaturals Products",
          quantity: "1",
        }
      ],
      redirect_url: "https://beenaturals-0ku.pages.dev/order-success",
    };

    const orderRes = await fetch(orderUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const orderData: any = await orderRes.json();
    console.log("BOG Order creation response:", JSON.stringify(orderData));

    if (!orderRes.ok) {
      const errorMsg = orderData.message || orderData.error || orderData.error_description || JSON.stringify(orderData);
      throw new Error(`BOG iPay Order failed: ${errorMsg}`);
    }

    // 3. Extract redirect URL
    const redirectUrl = orderData._links?.redirect?.href || 
                        orderData._links?.details?.href || 
                        orderData.redirect_url;

    if (!redirectUrl) {
      throw new Error("No redirect link returned from payment gateway");
    }

    return new Response(
      JSON.stringify({ redirectUrl }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("BOG Checkout function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
