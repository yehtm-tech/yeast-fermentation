import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit to support base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google Gen AI client safely
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } else {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will be unavailable.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI client:", error);
}

// 1. API: Read measurement photos -> Automatically convert to data table experiment data
app.post("/api/analyze-image", async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: "AI 服務尚未啟用，請檢查環境變數 GEMINI_API_KEY 是否正確配置。",
    });
  }

  const { image, mimeType, instrumentType } = req.body;

  if (!image) {
    return res.status(400).json({ error: "遺失圖片數據 (image is required)." });
  }

  try {
    // Standardize base64 string (remove prefix if present)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: base64Data,
      },
    };

    const promptText = `
      You are an expert laboratory assistant. Analyze this science experiment measurement photo and read the precise measurement values.
      
      We are collecting three parameters:
      1. CO₂ Gas Volume (CO₂ 產氣量) in milliliters (mL) - usually read from a graduated cylinder (刻度量筒) or gas syringe using the water displacement method (排水集氣法). Look at the water line / level / meniscus to determine the air volume (which is the empty space at the top of an inverted cylinder, or read the scale directly depending on layout).
      2. Temperature (溫度) in Celsius (°C) - read from a mercury/red-spirit liquid thermometer, digital thermometer, or sensor display.
      3. pH Value (pH 值) - read from a digital pH meter display, or a pH indicator paper strip (by comparing colors).
      
      Instructions:
      - If 'instrumentType' is specified as '${instrumentType}', pay special attention to that type of instrument.
      - Read the value carefully, looking for scales, digits, or color indicators.
      - If multiple instruments are present, read all of them.
      - Return your reading reasoning in Chinese (Traditional, 繁體中文) so the students and teachers can understand how you made the reading (e.g., describing meniscus, thermometer line, color comparison).
      - If a certain value is not present or unreadable, set it to null.
      
      Always respond in JSON with the exact requested schema.
    `;

    const textPart = {
      text: promptText,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedInstrument: {
              type: Type.STRING,
              description: "The instrument detected: 'cylinder', 'thermometer', 'ph_meter', 'ph_strip', 'multiple', 'unknown'."
            },
            co2VolumeMl: {
              type: Type.NUMBER,
              description: "The volume of CO2 in mL, or null if not detected."
            },
            temperatureC: {
              type: Type.NUMBER,
              description: "The temperature in °C, or null if not detected."
            },
            phValue: {
              type: Type.NUMBER,
              description: "The pH value, or null if not detected."
            },
            confidence: {
              type: Type.NUMBER,
              description: "The confidence of reading from 0.0 to 1.0."
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief reasoning in Traditional Chinese (繁體中文) explaining how the AI read the value (e.g., '量筒液面位於 24 mL 刻度，因此 CO₂ 產量為 24 mL' or '溫度計紅色液柱頂端精確指向 28.5 °C'). Keep it within 2-3 sentences."
            },
            readStatus: {
              type: Type.STRING,
              description: "Read status: 'success', 'blurry', 'no_instrument_found', 'error'."
            }
          },
          required: ["detectedInstrument", "confidence", "reasoning", "readStatus"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini.");
    }

    const result = JSON.parse(resultText);
    res.json(result);
  } catch (error: any) {
    console.error("Error analyzing image with Gemini:", error);
    res.status(500).json({
      error: "AI 影像辨識失敗: " + (error.message || "未知錯誤"),
    });
  }
});

// 2. API: Generate Scientific Report and Analysis based on all collected data
app.post("/api/generate-report", async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: "AI 服務尚未啟用，請檢查環境變數 GEMINI_API_KEY 是否正確配置。",
    });
  }

  const { dataPoints, experimentTitle, hypothesis } = req.body;

  if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0) {
    return res.status(400).json({ error: "請先蒐集或輸入實驗數據。" });
  }

  try {
    const promptText = `
      You are an elite science mentor. Review the following CO₂ production, Temperature, and pH experiment data:
      
      Experiment Title: ${experimentTitle || "CO₂ 產生與環境因子實驗"}
      Hypothesis (假設): ${hypothesis || "無特定假設"}
      
      Data points:
      ${JSON.stringify(dataPoints, null, 2)}
      
      Please write a professional, encouraging, and detailed Scientific Analysis and Report in Traditional Chinese (繁體中文) with the following sections (use beautiful markdown formatting):
      1. 數據趨勢摘要 (Data Trend Summary) - Summarize the change of CO₂ volume, temperature, and pH over time/trials.
      2. 科學原理探討 (Scientific Explanations) - Explain why these trends happened. (e.g., if it's yeast fermentation, explain how enzyme activity depends on temperature and pH, and how CO2 is produced).
      3. 實驗假說驗證 (Hypothesis Verification) - Discuss whether the data supports the hypothesis.
      4. 改善與下一步建議 (Improvements & Next Steps) - Suggest what variables to isolate next or how to improve the measurement precision.
      
      Keep the tone highly professional, precise, yet encouraging for high school or college students.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Error generating report with Gemini:", error);
    res.status(500).json({
      error: "AI 報告生成失敗: " + (error.message || "未知錯誤"),
    });
  }
});

// Set up server-side routing based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
