export async function onRequestPost(context: { env: Record<string, string>; request: Request }) {
  try {
    // Extract credentials directly from Cloudflare environment
    const clientId = context.env.BOG_CLIENT_ID;
    const secretKey = context.env.BOG_SECRET_KEY;

    if (!clientId || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Missing BOG_CLIENT_ID or BOG_SECRET_KEY in Cloudflare settings." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Request OAuth2 Token
    const authHeader = "Basic " + btoa(`${clientId}:${secretKey}`);
    const tokenRes = await fetch("https://oauth2.bog.ge/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenText = await tokenRes.text();

    if (!tokenRes.ok) {
      return new Response(
        JSON.stringify({ error: `BOG OAuth Auth Failed (${tokenRes.status}): ${tokenText.slice(0, 300)}` }),
        { status: tokenRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const tokenData = JSON.parse(tokenText);

    // Return Token Response for testing
    return new Response(JSON.stringify({ success: true, tokenData }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Server catch error: ${err.message || err}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
