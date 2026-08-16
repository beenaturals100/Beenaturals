interface Env {
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json();
    const apiKey = context.env.RESEND_API_KEY;
    // Default to a fallback email or the onboarding verified address
    const recipientEmail = context.env.NOTIFICATION_EMAIL || "orders@beenaturals.store";

    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured. Returning mock success response.");
      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          message: "Mock order email sent successfully.",
          recipient: recipientEmail,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { orderId, customer, items, subtotal, total, paymentMethod } = data;

    // Build items HTML list
    const itemsHtml = items
      .map(
        (item: any) => `
      <tr style="border-bottom: 1px solid #f1f0ea;">
        <td style="padding: 12px 8px; font-weight: bold; color: #292524;">${item.name}</td>
        <td style="padding: 12px 8px; color: #57534e; text-align: center;">${item.weight}</td>
        <td style="padding: 12px 8px; color: #57534e; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; font-weight: bold; color: #92400e; text-align: right;">${item.price * item.quantity} GEL</td>
      </tr>`
      )
      .join("");

    // Beautiful Amber-Themed Email Layout
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ახალი შეკვეთა - Beenaturals</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fffdf5; padding: 20px; margin: 0; color: #292524;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fef3c7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #d97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Beenaturals • ბინატურალს</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 14px;">ახალი შეკვეთა მიღებულია! (#${orderId})</p>
        </div>
        
        <!-- Customer Info -->
        <div style="padding: 24px;">
          <h2 style="font-size: 16px; border-bottom: 2px solid #fcd34d; padding-bottom: 8px; color: #78350f; margin-top: 0;">მიმღების ინფორმაცია</h2>
          <table style="width: 100%; font-size: 14px; line-height: 1.6;">
            <tr>
              <td style="width: 120px; font-weight: bold; color: #57534e; padding: 4px 0;">სახელი, გვარი:</td>
              <td style="color: #292524; padding: 4px 0;">${customer.firstName} ${customer.lastName}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #57534e; padding: 4px 0;">მისამართი:</td>
              <td style="color: #292524; padding: 4px 0;">${customer.address} (${customer.shippingZone})</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #57534e; padding: 4px 0;">ტელეფონი:</td>
              <td style="color: #292524; padding: 4px 0;">${customer.phone}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #57534e; padding: 4px 0;">გადახდა:</td>
              <td style="color: #292524; padding: 4px 0; font-weight: bold;">${
                paymentMethod === "cash" ? "კურიერთან გადახდა (ნაღდი)" : "ბარათით გადახდა (BOG)"
              }</td>
            </tr>
          </table>

          <!-- Items Table -->
          <h2 style="font-size: 16px; border-bottom: 2px solid #fcd34d; padding-bottom: 8px; color: #78350f; margin-top: 24px;">პროდუქცია</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #fff9db; border-bottom: 1px solid #fde68a;">
                <th style="padding: 10px 8px; text-align: left; color: #78350f;">პროდუქტი</th>
                <th style="padding: 10px 8px; text-align: center; color: #78350f;">წონა</th>
                <th style="padding: 10px 8px; text-align: center; color: #78350f;">რაოდ.</th>
                <th style="padding: 10px 8px; text-align: right; color: #78350f;">ფასი</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Summary -->
          <div style="margin-top: 20px; padding: 16px; background-color: #fffdf5; border: 1px solid #fef3c7; border-radius: 12px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #57534e;">პროდუქცია:</span>
              <span style="font-weight: bold; color: #292524; margin-left: auto;">${subtotal} GEL</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #57534e;">ტრანსპორტირება:</span>
              <span style="font-weight: bold; color: #292524; margin-left: auto;">+${customer.shippingFee} GEL</span>
            </div>
            <hr style="border: 0; border-top: 1px solid #fcd34d; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
              <span style="color: #78350f;">სულ გადასახდელი:</span>
              <span style="color: #92400e; margin-left: auto;">${total} GEL</span>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #fffbeb; padding: 16px; text-align: center; font-size: 12px; color: #78350f; border-top: 1px solid #fef3c7;">
          Beenaturals Store - სრულიად ნატურალური მეფუტკრეობის პროდუქტები
        </div>
      </div>
    </body>
    </html>
    `;

    // Make request to Resend API
    // Note: Resend requires a verified domain to send from.
    // If no domain is verified, Resend allows sending to the account owner from onboarding@resend.dev.
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Beenaturals Orders <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `New Beenaturals Order #${orderId} - ${customer.firstName} ${customer.lastName}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      const errText = JSON.stringify(resendData);
      throw new Error(`Resend API Error: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Email notification sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Resend integration endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
