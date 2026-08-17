interface Env {
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { searchParams } = new URL(context.request.url);
    const code = searchParams.get("code");

    if (!code || !/^\d{4}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid tracking code format. Must be 4 digits." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = context.env.NOTION_API_KEY;
    const dbId = context.env.NOTION_DATABASE_ID || "3bb634ee8c2a80f79d31c704a9d5281e";

    // Mock Mode fallback if API key is not configured
    if (!apiKey) {
      console.warn("NOTION_API_KEY is not configured. Returning mock tracking status.");
      
      let mockStage = 1;
      let mockStatusName = "თქვენი შეკვეთა მიღებულია";
      if (code === "1001") {
        mockStage = 1;
        mockStatusName = "თქვენი შეკვეთა მიღებულია";
      } else if (code === "1002") {
        mockStage = 2;
        mockStatusName = "თქვენი შეკვეთა მზად არის გასაგზავნად";
      } else if (code === "1003") {
        mockStage = 3;
        mockStatusName = "თქვენი შეკვეთა გაგზავნილია, კურიერი მალე მოგიტანთ";
      } else {
        const val = parseInt(code);
        mockStage = (val % 3) + 1;
        if (mockStage === 1) mockStatusName = "თქვენი შეკვეთა მიღებულია";
        else if (mockStage === 2) mockStatusName = "თქვენი შეკვეთა მზად არის გასაგზავნად";
        else mockStatusName = "თქვენი შეკვეთა გაგზავნილია, კურიერი მალე მოგიტანთ";
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "mock",
          trackingCode: code,
          statusName: mockStatusName,
          stage: mockStage,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let matchedPage: any = null;

    // 1. Query database for matching record by filtering on Tracking Code or Name
    try {
      const filterBody = {
        filter: {
          or: [
            {
              property: "Tracking Code",
              number: {
                equals: parseInt(code),
              },
            },
            {
              property: "Tracking Code",
              rich_text: {
                equals: code,
              },
            },
            {
              property: "Name",
              title: {
                contains: code,
              },
            },
          ],
        },
      };

      const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filterBody),
      });

      if (queryRes.ok) {
        const queryData: any = await queryRes.json();
        if (queryData.results && queryData.results.length > 0) {
          matchedPage = queryData.results[0];
        }
      }
    } catch (err) {
      console.error("Filter query to Notion failed:", err);
    }

    // 2. If filter query returned nothing or failed, fetch last 100 entries and scan in memory (backwards compatibility)
    if (!matchedPage) {
      try {
        const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 100 }),
        });

        if (queryRes.ok) {
          const queryData: any = await queryRes.json();
          const results = queryData.results || [];
          for (const page of results) {
            const props = page.properties || {};
            // Match title contains code
            const titleKey = Object.keys(props).find((k) => props[k].type === "title");
            if (titleKey) {
              const titleText = props[titleKey].title?.[0]?.text?.content || "";
              if (titleText.includes(code)) {
                matchedPage = page;
                break;
              }
            }

            // Match Tracking Code property
            const trackKey = Object.keys(props).find(
              (k) =>
                k.toLowerCase().replace(/[\s_-]/g, "") === "trackingcode" ||
                k.toLowerCase().replace(/[\s_-]/g, "") === "tracking" ||
                k.toLowerCase().replace(/[\s_-]/g, "") === "code"
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
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Extract and map status from page properties
    const statusName = matchedPage.properties['Delivery Status']?.select?.name || matchedPage.properties['Delivery Status']?.status?.name || '';

    // Map status string to stage index: 1, 2, or 3
    let stage = 1;
    const lowerStatus = statusName.toLowerCase();

    if (
      statusName.includes("გაგზავნილია") ||
      lowerStatus.includes("shipped") ||
      lowerStatus.includes("delivered") ||
      lowerStatus.includes("transit") ||
      lowerStatus.includes("კურიერ") ||
      lowerStatus.includes("done") ||
      lowerStatus.includes("completed") ||
      lowerStatus.includes("stage3") ||
      lowerStatus.includes("stage 3") ||
      lowerStatus.includes("stage_3")
    ) {
      stage = 3;
    } else if (
      statusName.includes("მზად არის") ||
      lowerStatus.includes("ready") ||
      lowerStatus.includes("in progress") ||
      lowerStatus.includes("doing") ||
      lowerStatus.includes("prepared") ||
      lowerStatus.includes("pack") ||
      lowerStatus.includes("stage2") ||
      lowerStatus.includes("stage 2") ||
      lowerStatus.includes("stage_2")
    ) {
      stage = 2;
    } else {
      stage = 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        trackingCode: code,
        statusName: statusName || "Default",
        stage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Tracking endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
