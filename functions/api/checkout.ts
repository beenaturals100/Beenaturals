export async function onRequestPost(context: { env: Record<string, string>; request: Request }) {
  try {
    const rawClientId = context.env.BOG_CLIENT_ID;
    const rawClientSecret = context.env.BOG_CLIENT_SECRET;

    const clientId = rawClientId ? rawClientId.trim().replace(/^["']|["']$/g, '') : "";
    const clientSecret = rawClientSecret ? rawClientSecret.trim().replace(/^["']|["']$/g, '') : "";
    const isSandbox = context.env.ENV_MODE !== "production";

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Missing BOG_CLIENT_ID or BOG_CLIENT_SECRET in Cloudflare settings." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Set BOG OAuth Endpoint based on sandbox mode
    const authUrl = isSandbox
      ? "https://oauth2-sandbox.bog.ge/auth/realms/bog/protocol/openid-connect/token"
      : "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

    // Request OAuth2 Token
    const authHeader = "Basic " + btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials"
      })
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
    return new Response(JSON.stringify({ success: true, tokenData, mode: isSandbox ? "sandbox" : "production" }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Server catch error: ${err.message || err}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
