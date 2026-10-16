const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_DETECTED_ITEMS = 8;

function normalizeDetectedFoods(payload) {
  const items = payload?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DETECTED_ITEMS) {
    throw new Error("The image did not contain a supported food result.");
  }

  return items.map((item) => {
    const name =
      typeof item?.name === "string" ? item.name.trim().slice(0, 120) : "";
    const portionGrams = Number(item?.portionGrams);
    const nutrition = {
      calories: Number(item?.calories),
      protein: Number(item?.protein),
      carbs: Number(item?.carbs),
      fat: Number(item?.fat),
    };

    if (
      !name ||
      !Number.isFinite(portionGrams) ||
      portionGrams < 1 ||
      portionGrams > 3000 ||
      Object.entries(nutrition).some(([key, value]) => {
        const maximum = key === "calories" ? 9000 : 100;
        const per100g = (value / portionGrams) * 100;
        return (
          !Number.isFinite(value) ||
          value < 0 ||
          !Number.isFinite(per100g) ||
          per100g > maximum
        );
      })
    ) {
      throw new Error("The image analysis returned invalid nutrition data.");
    }

    return {
      name,
      portionGrams: Math.round(portionGrams),
      nutritionPer100g: Object.fromEntries(
        Object.entries(nutrition).map(([key, value]) => [
          key,
          Number(((value / portionGrams) * 100).toFixed(2)),
        ])
      ),
    };
  });
}

async function analyzeFoodImage(imageBuffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  if (!apiKey) {
    const error = new Error("Food image analysis is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  "Identify each clearly visible prepared food item. Estimate its edible portion in grams and total calories, protein, carbohydrates, and fat for that portion. Return only JSON in the form {\"items\":[{\"name\":\"...\",\"portionGrams\":150,\"calories\":250,\"protein\":10,\"carbs\":30,\"fat\":8}]}. Use non-negative numeric values. Return an empty items array if no food is visible. Do not infer ingredients or claim precision beyond a visual estimate.",
              },
              {
                inlineData: {
                  mimeType,
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    portionGrams: { type: "NUMBER" },
                    calories: { type: "NUMBER" },
                    protein: { type: "NUMBER" },
                    carbs: { type: "NUMBER" },
                    fat: { type: "NUMBER" },
                  },
                  required: [
                    "name",
                    "portionGrams",
                    "calories",
                    "protein",
                    "carbs",
                    "fat",
                  ],
                },
              },
            },
            required: ["items"],
          },
        },
      }),
      signal: AbortSignal.timeout(45000),
    }
  );

  if (!response.ok) {
    let message = "Food image analysis failed. Please try again.";
    let statusCode = 502;
    if (response.status === 429) {
      message = "Food image analysis is busy. Please try again shortly.";
      statusCode = 503;
    } else if (response.status === 503) {
      message = "Gemini is temporarily unavailable. Please try again shortly.";
      statusCode = 503;
    } else if (response.status === 401 || response.status === 403) {
      message = "Gemini credentials or API access are not configured correctly.";
      statusCode = 503;
    } else if (response.status === 404) {
      message = "The configured Gemini model is unavailable. Update GEMINI_MODEL.";
      statusCode = 503;
    }
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("Food image analysis returned an invalid response.");
    error.statusCode = 502;
    throw error;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.find((part) => typeof part.text === "string")?.text;
  if (!text) {
    const error = new Error("No food items were recognized in this image.");
    error.statusCode = 422;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const error = new Error("Food image analysis returned invalid nutrition data.");
    error.statusCode = 502;
    throw error;
  }

  try {
    return normalizeDetectedFoods(parsed);
  } catch (error) {
    error.statusCode = 422;
    throw error;
  }
}

module.exports = { analyzeFoodImage, normalizeDetectedFoods };
