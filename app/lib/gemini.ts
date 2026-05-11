type GeminiPart = { text: string };

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

const getGeminiApiKey = () => process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

export async function generateGeminiText(prompt: string, systemInstruction: string) {
  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Missing Gemini API key. Set GEMINI_API_KEY in .env.local or environment.");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      const errorMsg = data.error?.message || `Gemini API request failed with status ${response.status}`;
      console.error("Gemini API error:", errorMsg, data);
      throw new Error(errorMsg);
    }

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";

    if (!text) {
      console.error("Gemini returned empty response. Full response:", data);
      throw new Error("Gemini returned an empty response.");
    }

    return text;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error("generateGeminiText failed:", err);
    throw error;
  }
}