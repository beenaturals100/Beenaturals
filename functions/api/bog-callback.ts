export const onRequestPost: PagesFunction = async (context) => {
  try {
    let payload: any = {};
    try {
      payload = await context.request.json();
      console.log("BOG Webhook callback payload received:", JSON.stringify(payload));
    } catch (e) {
      console.warn("BOG Webhook did not send a JSON payload:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "BOG webhook callback processed successfully",
        receivedOrderId: payload.order_id || payload.shop_order_id || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("BOG Webhook callback error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
