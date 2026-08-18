interface Env {}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    let payload: any = {};
    try {
      payload = await context.request.json();
      console.log("BOG Webhook callback payload received:", JSON.stringify(payload));
    } catch (e) {
      console.warn("BOG Webhook did not send a JSON payload:", e);
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = payload.body || {};
    const status = body.status;
    const shopOrderId = body.shop_order_id; // e.g. BEE-xxxxxx

    // BOG payment success status values can be "completed", "success", "COMPLETED", or "SUCCESS"
    const isSuccess =
      status === "completed" ||
      status === "success" ||
      status === "COMPLETED" ||
      status === "SUCCESS";

    if (!isSuccess || !shopOrderId) {
      console.log(`BOG Webhook ignored. Status: ${status}, Shop Order ID: ${shopOrderId}`);
      return new Response(JSON.stringify({ success: true, message: "Webhook received but status not successful" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Retrieve and parse base64-encoded orderData from URL query parameters
    const requestUrl = new URL(context.request.url);
    const encodedData = requestUrl.searchParams.get("data");

    if (!encodedData) {
      console.error("No order data query parameter found in BOG callback URL.");
      return new Response(JSON.stringify({ success: false, error: "Missing order data" }), {
        status: 200, // Return 200 to BOG to stop retrying
        headers: { "Content-Type": "application/json" },
      });
    }

    let orderData: any;
    try {
      const decoded = atob(encodedData);
      // Support UTF-8 characters safely during decoding
      const utf8Decoded = decodeURIComponent(
        decoded
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      orderData = JSON.parse(utf8Decoded);
    } catch (err) {
      console.error("Failed to decode orderData from callback URL query parameter:", err);
      return new Response(JSON.stringify({ success: false, error: "Invalid encoded order data" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const origin = requestUrl.origin;

    // 1. Log order to Notion database (uses upsert-aware api/notion)
    console.log(`Recording order in Notion via webhook: ${shopOrderId}`);
    const notionRes = await fetch(`${origin}/api/notion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...orderData,
        paymentStatus: "გადახდილი" // Set payment status to Paid
      }),
    });

    let alreadyPaid = false;
    if (notionRes.ok) {
      const notionData: any = await notionRes.json();
      alreadyPaid = !!notionData.alreadyPaid;
    } else {
      const errText = await notionRes.text();
      console.error(`Notion webhook logging failed: ${errText}`);
    }

    // 2. Trigger order confirmation email to merchant via Resend (if not already paid/sent)
    if (!alreadyPaid) {
      console.log(`Triggering email notification via webhook for order: ${shopOrderId}`);
      const resendRes = await fetch(`${origin}/api/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error(`Resend webhook notification failed: ${errText}`);
      }
    } else {
      console.log(`Webhook skipped email trigger (order already processed as paid).`);
    }

    return new Response(JSON.stringify({ success: true, message: "Order processed and logged" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("BOG Webhook callback processing error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Always return 200 to stop retry loop on unhandled exceptions
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const onRequestGet: PagesFunction = async (_context) => {
  return new Response(
    JSON.stringify({
      success: true,
      message: "BOG callback endpoint is active.",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
