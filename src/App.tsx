import React, { useState, useRef, useEffect } from "react";
import {
  Beaker,
  Camera,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Settings,
  LineChart as ChartIcon,
  Layers,
  Thermometer,
  Compass,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Interfaces
interface DataPoint {
  id: string;
  time: string; // Time point or Trial Name
  co2Volume: number | null; // mL
  temperature: number | null; // °C
  ph: number | null; // pH value
  source: string; // e.g., "AI 辨識", "手動輸入", "模擬實驗"
  notes: string;
}

interface AIAnalysisResult {
  detectedInstrument: string;
  co2VolumeMl: number | null;
  temperatureC: number | null;
  phValue: number | null;
  confidence: number;
  reasoning: string;
  readStatus: string;
}

export default function App() {
  // 1. Core Experiment Metadata State
  const [experimentTitle, setExperimentTitle] = useState("酵母菌在不同溫度下的發酵速率與 pH 值變化實驗");
  const [hypothesis, setHypothesis] = useState("在攝氏 35°C 至 40°C 且微酸性環境 (pH 5.5) 下，酵母菌活性最高，CO₂ 產氣量增加最快。");
  const [experimentType, setExperimentType] = useState("yeast"); // 'yeast' | 'acid' | 'custom'

  // 2. Data Points Worksheet State (With initial high-quality yeast fermentation template)
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([
    { id: "1", time: "0 分鐘", co2Volume: 0, temperature: 37, ph: 6.2, source: "手動初始化", notes: "實驗開始，加入 5% 葡萄糖與酵母菌液" },
    { id: "2", time: "5 分鐘", co2Volume: 12, temperature: 37, ph: 5.9, source: "手動輸入", notes: "開始產生細微氣泡，溶液略顯渾濁" },
    { id: "3", time: "10 分鐘", co2Volume: 28, temperature: 36.8, ph: 5.6, source: "手動輸入", notes: "氣泡產生速率加快，發酵氣味明顯" },
  ]);

  // 3. Image Selection / Simulation State
  const [activeTab, setActiveTab] = useState<"simulator" | "camera" | "upload">("simulator");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  // Virtual Simulator Sliders
  const [simCO2, setSimCO2] = useState<number>(45);
  const [simTemp, setSimTemp] = useState<number>(37.5);
  const [simPH, setSimPH] = useState<number>(5.2);
  const [simulatorMode, setSimulatorMode] = useState<"all" | "cylinder" | "thermometer" | "ph_meter">("all");

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 4. AI Recognition Result & Loading States
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAIResult] = useState<AIAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 5. AI Scientific Report State
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string>("");
  const [reportError, setReportError] = useState<string | null>(null);

  // 6. UI Active Views & Helpers
  const [activeChartTab, setActiveChartTab] = useState<"co2" | "temp" | "ph" | "all">("all");
  const [helpOpen, setHelpOpen] = useState(false);
  const simulatorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 7. Load presets
  const handleLoadPreset = (presetType: string) => {
    if (presetType === "yeast") {
      setExperimentTitle("酵母菌在不同溫度下的發酵速率與 pH 值變化實驗");
      setHypothesis("在攝氏 35°C 至 40°C 且微酸性環境 (pH 5.5) 下，酵母菌活性最高，CO₂ 產氣量增加最快。");
      setDataPoints([
        { id: "1", time: "0 分鐘", co2Volume: 0, temperature: 37, ph: 6.2, source: "手動初始化", notes: "實驗開始，加入 5% 葡萄糖與酵母菌液" },
        { id: "2", time: "5 分鐘", co2Volume: 12, temperature: 37, ph: 5.9, source: "手動輸入", notes: "開始產生細微氣泡，溶液略顯渾濁" },
        { id: "3", time: "10 分鐘", co2Volume: 28, temperature: 36.8, ph: 5.6, source: "手動輸入", notes: "氣泡產生速率加快，發酵氣味明顯" },
      ]);
    } else if (presetType === "acid") {
      setExperimentTitle("碳酸鈣與鹽酸反應之產氣速率與 pH 變化研究");
      setHypothesis("鹽酸濃度越高，反應速率越快，CO₂ 產氣量在反應前段呈線性暴增，同時溶液 pH 值快速上升。");
      setDataPoints([
        { id: "1", time: "0 秒", co2Volume: 0, temperature: 25, ph: 1.5, source: "手動初始化", notes: "投入 2 克碳酸鈣固體" },
        { id: "2", time: "10 秒", co2Volume: 35, temperature: 26.2, ph: 2.1, source: "手動輸入", notes: "反應極其劇烈，產生大量氣泡與白霧" },
        { id: "3", time: "20 秒", co2Volume: 62, temperature: 27.5, ph: 2.8, source: "手動輸入", notes: "產氣速率逐漸放緩，反應放熱溫度上升" },
        { id: "4", time: "30 秒", co2Volume: 80, temperature: 28.1, ph: 3.5, source: "手動輸入", notes: "碳酸鈣幾乎耗盡，溶液逐漸變清澈" },
      ]);
    } else {
      setExperimentTitle("自訂二氧化碳與環境因子控制實驗");
      setHypothesis("請在此處輸入您的實驗假設與預期趨勢。");
      setDataPoints([
        { id: "1", time: "第 1 次測量", co2Volume: 10, temperature: 25.0, ph: 7.0, source: "手動初始化", notes: "初始狀態記錄" },
      ]);
    }
    setReportMarkdown("");
  };

  // Draw Simulator Equipment onto Canvas whenever Sliders or mode changes
  useEffect(() => {
    const canvas = simulatorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw solid dark background to make instruments pop
    ctx.fillStyle = "#1e293b"; // Slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid details overlaying the background (looks like graphing paper or science blueprint)
    ctx.strokeStyle = "rgba(71, 85, 105, 0.3)";
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Title label on top
    ctx.fillStyle = "#94a3b8"; // Slate-400
    ctx.font = "bold 12px monospace";
    ctx.fillText("VIRTUAL SCIENCE LAB EQUIPMENT SIMULATOR", 15, 25);

    // Draw requested instruments based on active mode
    if (simulatorMode === "all") {
      // Draw Cylinder (left-center)
      drawCylinder(ctx, 40, 50, 120, 240, simCO2);
      // Draw Thermometer (middle-right)
      drawThermometer(ctx, 200, 50, 50, 240, simTemp);
      // Draw pH Meter (far-right)
      drawPHMeter(ctx, 290, 80, 100, 120, simPH);
    } else if (simulatorMode === "cylinder") {
      drawCylinder(ctx, 130, 40, 140, 260, simCO2);
    } else if (simulatorMode === "thermometer") {
      drawThermometer(ctx, 160, 40, 80, 260, simTemp);
    } else if (simulatorMode === "ph_meter") {
      drawPHMeter(ctx, 110, 60, 180, 180, simPH);
    }

  }, [simCO2, simTemp, simPH, simulatorMode]);

  // Helper: Draw graduated cylinder with gas bubble and water levels
  function drawCylinder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, volumeMl: number) {
    // Volume goes from 0 to 100
    const fillPercent = (100 - volumeMl) / 100; // Inverted cylinder for gas collection
    const waterHeight = h * 0.7 * fillPercent;
    const gasHeight = h * 0.7 * (1 - fillPercent);
    const startY = y + h * 0.15;

    // Draw stand base
    ctx.fillStyle = "#475569";
    ctx.fillRect(x - 10, y + h - 15, w + 20, 15);

    // Draw cylinder glass background
    ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(x, startY, w, h * 0.7);
    ctx.fill();
    ctx.stroke();

    // Draw Water Level (blue)
    if (waterHeight > 0) {
      ctx.fillStyle = "rgba(14, 165, 233, 0.5)"; // Sky blue
      ctx.fillRect(x + 2, startY + gasHeight, w - 4, waterHeight);
      
      // Draw Meniscus line
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x + w/2, startY + gasHeight, w/2 - 2, 6, 0, 0, Math.PI);
      ctx.stroke();
    }

    // Draw bubbles rising in the water (fermentation effect!)
    if (volumeMl > 10) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      for (let i = 0; i < 6; i++) {
        const bx = x + 15 + ((i * 27) % (w - 30));
        const by = startY + gasHeight + 10 + ((i * 31 + (volumeMl * 2)) % (waterHeight || 40));
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw graduation lines and numbers on the left side
    ctx.strokeStyle = "#94a3b8";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "9px monospace";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 100; i += 10) {
      const lineY = startY + (h * 0.7) * (i / 100);
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + 12, lineY);
      ctx.stroke();

      // Labels (inverted reading since gas pushes liquid down, or direct)
      // Standard inverted graduated cylinder: 0 is at the very top, 100 at bottom
      ctx.fillText(`${100 - i}`, x + 16, lineY + 3);
    }

    // Unit Label on cylinder
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("CO₂ (mL)", x + w / 2 - 25, y + h * 0.1);

    // Draw active reading banner
    ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + h + 5, w - 10, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`Value: ${volumeMl} mL`, x + 12, y + h + 18);
  }

  // Helper: Draw standard laboratory thermometer
  function drawThermometer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tempVal: number) {
    const startY = y + h * 0.1;
    const thermHeight = h * 0.75;
    const bulbRadius = w * 0.25;
    const tubeWidth = w * 0.2;

    const centerX = x + w / 2;
    const bulbY = startY + thermHeight;

    // Outer glass outline (bulb + tube)
    ctx.fillStyle = "rgba(148, 163, 184, 0.1)";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 3;

    // Draw tube and bulb
    ctx.beginPath();
    ctx.moveTo(centerX - tubeWidth/2, startY);
    ctx.lineTo(centerX - tubeWidth/2, bulbY - bulbRadius);
    // bulb curve
    ctx.arc(centerX, bulbY, bulbRadius, Math.PI + Math.PI/4, Math.PI*2 - Math.PI/4, false);
    ctx.lineTo(centerX + tubeWidth/2, startY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red liquid column level (0°C to 100°C)
    const tempPercent = Math.min(Math.max(tempVal / 100, 0), 1);
    const liquidTopY = bulbY - bulbRadius - (thermHeight - bulbRadius * 2) * tempPercent;

    // Draw red mercury bulb and column
    ctx.fillStyle = "#ef4444"; // Vivid red
    ctx.beginPath();
    ctx.arc(centerX, bulbY, bulbRadius - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(centerX - tubeWidth/2 + 2, liquidTopY, tubeWidth - 4, bulbY - bulbRadius - liquidTopY + 2);

    // Draw thermometer scales
    ctx.strokeStyle = "#94a3b8";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "9px monospace";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 100; i += 20) {
      const markY = bulbY - bulbRadius - (thermHeight - bulbRadius * 2) * (i / 100);
      // Left side lines
      ctx.beginPath();
      ctx.moveTo(centerX - tubeWidth/2 - 8, markY);
      ctx.lineTo(centerX - tubeWidth/2 - 1, markY);
      ctx.stroke();
      ctx.fillText(`${i}°C`, centerX - tubeWidth/2 - 35, markY + 3);
    }

    // Header label
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("Temp (°C)", x + w / 2 - 27, y + h * 0.05);

    // Reading banner
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + h + 5, w - 4, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`${tempVal} °C`, x + 10, y + h + 18);
  }

  // Helper: Draw electronic pH meter with numeric digital LCD display
  function drawPHMeter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phVal: number) {
    // Device Body
    ctx.fillStyle = "#0f172a"; // Slate-900 (Rugged housing)
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y + 20, w, h - 35, 8);
    ctx.fill();
    ctx.stroke();

    // Electrode glass bulb extension at the bottom
    ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + w/2 - 8, y + h - 15, 16, 25, 4);
    ctx.fill();
    ctx.stroke();

    // pH value relative color strip inside electrode
    ctx.fillStyle = getPHColor(phVal);
    ctx.beginPath();
    ctx.arc(x + w/2, y + h + 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Digital LCD Screen
    ctx.fillStyle = "#020617"; // Black background
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 35, w - 20, 45, 4);
    ctx.fill();
    ctx.stroke();

    // LCD text display
    ctx.fillStyle = "#10b981"; // Bright neon emerald digit
    ctx.font = "bold 18px Courier New";
    ctx.fillText(`pH ${phVal.toFixed(2)}`, x + 20, y + 62);

    // Indicator label on screen
    ctx.font = "8px Courier New";
    ctx.fillStyle = "#34d399";
    ctx.fillText("ATC CALIBRATED", x + 20, y + 46);

    // pH Indicator color reference board
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "9px sans-serif";
    ctx.fillText("pH SCALE 1 - 14", x + 10, y + 97);

    // Colored gradient dots for visual reference
    for (let i = 1; i <= 7; i++) {
      const dotPh = (i * 2);
      ctx.fillStyle = getPHColor(dotPh);
      ctx.beginPath();
      ctx.arc(x + 15 + (i - 1) * 12, y + 107, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Header label
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("pH Meter", x + w / 2 - 28, y + 10);
  }

  // Get color match representation for pH scale values
  function getPHColor(ph: number) {
    if (ph <= 2) return "#ef4444"; // Red (Strong Acid)
    if (ph <= 4) return "#f97316"; // Orange (Acid)
    if (ph <= 6) return "#eab308"; // Yellow (Weak Acid)
    if (ph <= 7.2) return "#22c55e"; // Green (Neutral)
    if (ph <= 9) return "#06b6d4"; // Cyan (Weak Alkali)
    if (ph <= 11) return "#3b82f6"; // Blue (Alkali)
    return "#6366f1"; // Purple/Indigo (Strong Alkali)
  }

  // Active Camera capture helper
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setAnalysisError("無法啟動相機。請確認已授予相機存取權限。");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Turn active stream off when shifting tabs
  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    }
  }, [activeTab]);

  // Take Snapshot from video element
  const captureCameraPhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setImagePreviewUrl(dataUrl);
    stopCamera();
    
    // Auto Trigger AI Identification
    handleAnalyzeImage(dataUrl, "image/png");
  };

  // Uploaded File handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreviewUrl(dataUrl);
        // Trigger AI Identification
        handleAnalyzeImage(dataUrl, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger snapshot of Virtual Lab Equipment Canvas and send to AI
  const captureVirtualSimulatorAndSend = () => {
    const canvas = simulatorCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setImagePreviewUrl(dataUrl);
    handleAnalyzeImage(dataUrl, "image/png");
  };

  // Call API for Gemini analysis
  const handleAnalyzeImage = async (base64Image: string, mimeType: string) => {
    setAnalyzing(true);
    setAIResult(null);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          mimeType: mimeType || "image/png",
          instrumentType: simulatorMode === "all" ? "auto" : simulatorMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分析圖片失敗");
      }

      const result: AIAnalysisResult = await response.json();
      setAIResult(result);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setAnalysisError(err.message || "發生未知錯誤");
    } finally {
      setAnalyzing(false);
    }
  };

  // Append AI Detected measurements directly to the worksheet
  const appendResultToTable = () => {
    if (!aiResult) return;

    const newPoint: DataPoint = {
      id: Date.now().toString(),
      time: `測量點 ${dataPoints.length + 1}`,
      co2Volume: aiResult.co2VolumeMl,
      temperature: aiResult.temperatureC,
      ph: aiResult.phValue,
      source: "AI 辨識 - " + (
        aiResult.detectedInstrument === "cylinder" ? "刻度量筒" :
        aiResult.detectedInstrument === "thermometer" ? "溫度計" :
        aiResult.detectedInstrument === "ph_meter" || aiResult.detectedInstrument === "ph_strip" ? "pH計" : "綜合影像"
      ),
      notes: aiResult.reasoning || "AI 讀取成功",
    };

    setDataPoints([...dataPoints, newPoint]);
  };

  // Add empty row to Table
  const handleAddRow = () => {
    const lastRow = dataPoints[dataPoints.length - 1];
    const newPoint: DataPoint = {
      id: Date.now().toString(),
      time: lastRow ? `第 ${dataPoints.length + 1} 次測量` : "第 1 次測量",
      co2Volume: lastRow ? lastRow.co2Volume : 10,
      temperature: lastRow ? lastRow.temperature : 25.0,
      ph: lastRow ? lastRow.ph : 7.0,
      source: "手動輸入",
      notes: "輸入實驗註解...",
    };
    setDataPoints([...dataPoints, newPoint]);
  };

  // Update cell in Worksheet
  const handleUpdateCell = (id: string, field: keyof DataPoint, value: any) => {
    setDataPoints(
      dataPoints.map((point) => {
        if (point.id === id) {
          return { ...point, [field]: value };
        }
        return point;
      })
    );
  };

  // Delete row in Worksheet
  const handleDeleteRow = (id: string) => {
    setDataPoints(dataPoints.filter((point) => point.id !== id));
  };

  // Clear worksheet
  const handleClearTable = () => {
    if (confirm("您確定要清除現有的所有實驗數據點嗎？")) {
      setDataPoints([]);
    }
  };

  // Export Worksheet to standard CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for proper Excel rendering
    csvContent += "時間/測量序號,二氧化碳產氣量 (mL),溫度 (°C),pH 值,數據來源,備註\n";

    dataPoints.forEach((point) => {
      const co2 = point.co2Volume !== null ? point.co2Volume : "無";
      const temp = point.temperature !== null ? point.temperature : "無";
      const ph = point.ph !== null ? point.ph : "無";
      csvContent += `"${point.time}","${co2}","${temp}","${ph}","${point.source}","${point.notes}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${experimentTitle || "CO2_實驗數據"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Scientific Report using Gemini API
  const handleGenerateReport = async () => {
    if (dataPoints.length === 0) return;
    setGeneratingReport(true);
    setReportError(null);
    setReportMarkdown("");

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataPoints,
          experimentTitle,
          hypothesis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成報告失敗");
      }

      const result = await response.json();
      setReportMarkdown(result.report || "");
    } catch (err: any) {
      console.error("Generate Report Error:", err);
      setReportError(err.message || "發生未知錯誤");
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* 1. Upper Scientific Header Branding */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 shadow-sm shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center text-white">
            <Beaker className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200 uppercase tracking-widest">
                AI Studio 連線中
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">v2.4 (Google GenAI)</span>
            </div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 flex items-center gap-2">
              CO₂ 實驗數據自動化分析助理
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 rounded transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
            使用說明
          </button>
          <div className="h-8 w-[1px] bg-slate-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold">Experiment ID</span>
            <span className="text-sm font-mono font-bold text-slate-800">EXP-CO2-0042</span>
          </div>
        </div>
      </header>

      {/* 2. Help Info Banner */}
      {helpOpen && (
        <div className="bg-white border-b border-slate-200 py-6 px-8 shadow-sm">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-slate-600">
            <div className="space-y-2 border-l-2 border-teal-500 pl-4">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                1. 執行實驗與拍照
              </h4>
              <p className="leading-relaxed text-slate-500">
                使用 inverted measuring cylinder (排水集氣量筒) 收集 CO₂，並將溫度計或 pH 計放置於測試液中。保持刻度清晰。
              </p>
            </div>
            <div className="space-y-2 border-l-2 border-teal-500 pl-4">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                2. 拍照或上傳 AI
              </h4>
              <p className="leading-relaxed text-slate-500">
                使用現場相機拍攝刻度、或直接拖曳上傳相片。若手邊無實體設備，可使用左側的<b>「虛擬實驗室」</b>拉動拉條生成儀器畫面。
              </p>
            </div>
            <div className="space-y-2 border-l-2 border-teal-500 pl-4">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                3. 自動化數值擷取
              </h4>
              <p className="leading-relaxed text-slate-500">
                Gemini AI 將精確估讀刻度（如量筒彎液面、溫度計紅柱高度、顯示面板），產生辨識報告，一鍵即能將數據填入右側工作表。
              </p>
            </div>
            <div className="space-y-2 border-l-2 border-teal-500 pl-4">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                4. 科學報告與趨勢圖
              </h4>
              <p className="leading-relaxed text-slate-500">
                系統自動繪製即時交互趨勢圖。點擊底部按鈕即可一鍵產出符合科學專題標準的 <b>AI 數據分析報告</b>！
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6 w-full flex-1">
        
        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
          
          {/* LEFT PANEL (Span 5): CAMERA, UPLOAD, SIMULATOR, AI READING RESULT */}
          <div className="lg:col-span-5 flex flex-col gap-6" id="left-panel">
            
            {/* Box 1: Image Sourcing Methods */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">實驗影像擷取與 AI 辨識</h3>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                  <button
                    onClick={() => setActiveTab("simulator")}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      activeTab === "simulator"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🎯 虛擬模擬器
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("camera");
                      startCamera();
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      activeTab === "camera"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📷 即時相機
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      activeTab === "upload"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📁 照片上傳
                  </button>
                </div>
              </div>

              {/* TAB CONTENT: VIRTUAL SIMULATOR */}
              {activeTab === "simulator" && (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex justify-center p-2">
                    <canvas
                      ref={simulatorCanvasRef}
                      width={400}
                      height={320}
                      className="max-w-full rounded bg-slate-800"
                    />
                  </div>

                  {/* Simulator Device Controls */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 font-bold uppercase tracking-wider">虛擬儀器控制面板</span>
                      <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded border border-slate-200 shrink-0">
                        <button
                          onClick={() => setSimulatorMode("all")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${simulatorMode === "all" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          全部儀器
                        </button>
                        <button
                          onClick={() => setSimulatorMode("cylinder")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${simulatorMode === "cylinder" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          量筒
                        </button>
                        <button
                          onClick={() => setSimulatorMode("thermometer")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${simulatorMode === "thermometer" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          溫度計
                        </button>
                        <button
                          onClick={() => setSimulatorMode("ph_meter")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${simulatorMode === "ph_meter" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          pH計
                        </button>
                      </div>
                    </div>

                    {/* Cylinder Slider */}
                    {(simulatorMode === "all" || simulatorMode === "cylinder") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-semibold">CO₂ 集氣量筒水面調控:</span>
                          <span className="font-mono text-teal-600 font-bold">{simCO2} mL</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={simCO2}
                          onChange={(e) => setSimCO2(Number(e.target.value))}
                          className="w-full accent-teal-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Thermometer Slider */}
                    {(simulatorMode === "all" || simulatorMode === "thermometer") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-semibold">溫度計紅色液柱調控:</span>
                          <span className="font-mono text-orange-600 font-bold">{simTemp} °C</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={simTemp}
                          onChange={(e) => setSimTemp(Number(e.target.value))}
                          className="w-full accent-orange-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {/* pH Slider */}
                    {(simulatorMode === "all" || simulatorMode === "ph_meter") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-semibold">電子 pH 測試計數值:</span>
                          <span className="font-mono text-indigo-600 font-bold">{simPH.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="14"
                          step="0.1"
                          value={simPH}
                          onChange={(e) => setSimPH(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={captureVirtualSimulatorAndSend}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition hover:scale-[1.01] shadow-sm tracking-wide text-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    拍攝虛擬儀器並送交 AI 辨識
                  </button>
                </div>
              )}

              {/* TAB CONTENT: CAMERA */}
              {activeTab === "camera" && (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                    {cameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-6 text-center">
                        <Camera className="w-12 h-12 text-slate-300 animate-pulse" />
                        <p className="text-xs text-slate-500">
                          相機串流未啟動。請點擊下方按鈕開啟鏡頭。
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!cameraActive ? (
                      <button
                        onClick={startCamera}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-teal-500" />
                        啟動實驗相機
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={captureCameraPhoto}
                          className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          拍照並分析數據
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition text-xs border border-slate-200 cursor-pointer"
                        >
                          關閉
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    提示：請確保儀器與刻度面對相機，避免鏡頭晃動或環境過於昏暗。
                  </p>
                </div>
              )}

              {/* TAB CONTENT: FILE UPLOAD */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-lg p-8 text-center hover:border-teal-500/50 hover:bg-white transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Upload className="w-10 h-10 text-teal-600 mb-1" />
                      <p className="text-sm font-semibold text-slate-800">點擊或拖曳實驗相片至此</p>
                      <p className="text-xs text-slate-500">支援 PNG, JPG, JPEG 格式，檔案不大於 10MB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: Real-time Analysis Progress & Result Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  AI 影像辨識診斷報告
                </h3>

                {/* Show thumbnail of the active/analyzed image */}
                {imagePreviewUrl && (
                  <div className="mb-4 relative rounded overflow-hidden border border-slate-200 max-h-32 flex justify-center bg-slate-50">
                    <img
                      src={imagePreviewUrl}
                      alt="Last captured"
                      className="object-contain max-h-32"
                    />
                    <div className="absolute top-1 right-1 bg-slate-900/80 text-[9px] px-1.5 py-0.5 rounded text-white border border-slate-800">
                      當前分析圖檔
                    </div>
                  </div>
                )}

                {/* Idle Mode */}
                {!analyzing && !aiResult && !analysisError && (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-center gap-2">
                    <Compass className="w-10 h-10 text-slate-300 animate-spin" />
                    <p className="text-xs max-w-xs leading-relaxed text-slate-500">
                      等待影像輸入。請點擊上方的<b>「拍照」</b>、<b>「模擬器拍攝」</b>或<b>「上傳照片」</b>以觸發自動化刻度讀取。
                    </p>
                  </div>
                )}

                {/* Analyzing Spinner */}
                {analyzing && (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-600 rounded-full animate-spin"></div>
                      <Beaker className="w-5 h-5 text-teal-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">AI Studio 讀取測量照片中...</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      正在辨識刻度量筒水面彎液面、紅色液柱或顯示面板數據。
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {analysisError && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex gap-2 text-red-700 text-xs mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">影像分析發生異常</p>
                      <p className="mt-1 text-red-600/90 leading-relaxed">{analysisError}</p>
                    </div>
                  </div>
                )}

                {/* Success Display Result */}
                {aiResult && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Volume Display */}
                      <div className="bg-sky-50/50 border border-sky-100 p-2.5 rounded-lg text-center relative overflow-hidden">
                        <span className="text-[9px] text-sky-800 block font-bold uppercase tracking-wider">CO₂ Gas Volume</span>
                        <span className="text-lg font-mono font-bold text-sky-600 block mt-1">
                          {aiResult.co2VolumeMl !== null ? `${aiResult.co2VolumeMl} mL` : "未檢出"}
                        </span>
                        <div className="absolute top-0 right-0 w-1 h-full bg-sky-500"></div>
                      </div>

                      {/* Temperature Display */}
                      <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-lg text-center relative overflow-hidden">
                        <span className="text-[9px] text-orange-800 block font-bold uppercase tracking-wider">Temperature</span>
                        <span className="text-lg font-mono font-bold text-orange-600 block mt-1">
                          {aiResult.temperatureC !== null ? `${aiResult.temperatureC} °C` : "未檢出"}
                        </span>
                        <div className="absolute top-0 right-0 w-1 h-full bg-orange-500"></div>
                      </div>

                      {/* pH Display */}
                      <div className="bg-teal-50/50 border border-teal-100 p-2.5 rounded-lg text-center relative overflow-hidden">
                        <span className="text-[9px] text-teal-800 block font-bold uppercase tracking-wider">pH Level</span>
                        <span className="text-lg font-mono font-bold text-teal-600 block mt-1">
                          {aiResult.phValue !== null ? aiResult.phValue.toFixed(1) : "未檢出"}
                        </span>
                        <div className="absolute top-0 right-0 w-1 h-full bg-teal-500"></div>
                      </div>
                    </div>

                    {/* Reasoning explanation box */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-left">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">AI 讀取推論過程及依據</span>
                        <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200 font-bold">
                          信心度: {(aiResult.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {aiResult.reasoning}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action: Append to Table */}
              {aiResult && (
                <button
                  onClick={appendResultToTable}
                  className="w-full mt-4 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 font-bold py-2.5 px-4 rounded-lg border border-teal-200 transition flex items-center justify-center gap-2 text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  將此 AI 辨識數值記錄至數據表
                </button>
              )}
            </div>
          </div>

          {/* RIGHT PANEL (Span 7): DATA WORKSHEET & LIVE SCIENTIFIC CHARTS */}
          <div className="lg:col-span-7 flex flex-col gap-6" id="right-panel">
            
            {/* Box 3: Experiment Title & Hypothesis Setting */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">實驗基本設定</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">快速載入範本:</span>
                  <select
                    onChange={(e) => handleLoadPreset(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-teal-700 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
                    defaultValue="yeast"
                  >
                    <option value="yeast">酵母菌發酵作用 (預設)</option>
                    <option value="acid">碳酸鈣+鹽酸產氣</option>
                    <option value="custom">自訂實驗項目</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">實驗主題名稱</label>
                  <input
                    type="text"
                    value={experimentTitle}
                    onChange={(e) => setExperimentTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    placeholder="請輸入實驗主題..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">實驗假說 (Hypothesis)</label>
                  <input
                    type="text"
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    placeholder="例如：溫度升高，反應氣泡產量將隨之..."
                  />
                </div>
              </div>
            </div>

            {/* Box 4: Interactive Trends Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <ChartIcon className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">實驗數據變化趨勢圖</h3>
                </div>
                <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0">
                  <button
                    onClick={() => setActiveChartTab("all")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                      activeChartTab === "all" ? "bg-white text-teal-600 shadow-xs border border-teal-100" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    綜合圖表
                  </button>
                  <button
                    onClick={() => setActiveChartTab("co2")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                      activeChartTab === "co2" ? "bg-sky-50 text-sky-600 border border-sky-100" : "text-slate-500 hover:text-sky-600"
                    }`}
                  >
                    CO₂ 產氣
                  </button>
                  <button
                    onClick={() => setActiveChartTab("temp")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                      activeChartTab === "temp" ? "bg-orange-50 text-orange-600 border border-orange-100" : "text-slate-500 hover:text-orange-600"
                    }`}
                  >
                    溫度
                  </button>
                  <button
                    onClick={() => setActiveChartTab("ph")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                      activeChartTab === "ph" ? "bg-teal-50 text-teal-700 border border-teal-100" : "text-slate-500 hover:text-teal-700"
                    }`}
                  >
                    pH 值
                  </button>
                </div>
              </div>

              {/* Recharts Render Stage */}
              <div className="w-full h-64 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                {dataPoints.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <ChartIcon className="w-10 h-10 text-slate-300" />
                    <p className="text-xs">數據工作表為空，無法繪製趨勢圖。</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataPoints} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#1e293b" }}
                        labelStyle={{ color: "#64748b", fontWeight: "bold", fontSize: "11px" }}
                      />
                      <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: "11px", color: "#475569" }} />
                      
                      {(activeChartTab === "all" || activeChartTab === "co2") && (
                        <Line
                          name="CO₂ 產量 (mL)"
                          type="monotone"
                          dataKey="co2Volume"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                      
                      {(activeChartTab === "all" || activeChartTab === "temp") && (
                        <Line
                          name="溫度 (°C)"
                          type="monotone"
                          dataKey="temperature"
                          stroke="#ea580c"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      )}

                      {(activeChartTab === "all" || activeChartTab === "ph") && (
                        <Line
                          name="pH 值"
                          type="monotone"
                          dataKey="ph"
                          stroke="#0d9488"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Box 5: Scientific Worksheet Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">實驗數據工作表</h3>
                </div>
                
                <div className="flex gap-1.5 self-end sm:self-auto shrink-0">
                  <button
                    onClick={handleAddRow}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded border border-slate-800 transition flex items-center gap-1 text-[11px] cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-400" />
                    新增測量點
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-1.5 px-3 rounded border border-slate-200 transition flex items-center gap-1 text-[11px] cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    匯出 CSV
                  </button>
                  <button
                    onClick={handleClearTable}
                    className="bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 py-1.5 px-2.5 rounded border border-red-150 transition text-[11px] cursor-pointer"
                    title="清空所有數據"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Table structure */}
              <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-3 font-bold uppercase text-[10px] tracking-wider w-1/5">時間/測量序號</th>
                      <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-sky-700 w-1/6">CO₂ (mL)</th>
                      <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-orange-700 w-1/6">溫度 (°C)</th>
                      <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-teal-700 w-1/6">pH 值</th>
                      <th className="p-3 font-bold uppercase text-[10px] tracking-wider w-1/4">來源與備註</th>
                      <th className="p-3 text-center w-10">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataPoints.map((point) => (
                      <tr key={point.id} className="hover:bg-slate-50/50 transition">
                        {/* Time cell */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={point.time}
                            onChange={(e) => handleUpdateCell(point.id, "time", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-850 text-xs focus:outline-none focus:border-teal-500 font-semibold"
                          />
                        </td>
                        {/* CO2 cell */}
                        <td className="p-2">
                          <input
                            type="number"
                            value={point.co2Volume !== null ? point.co2Volume : ""}
                            onChange={(e) => handleUpdateCell(point.id, "co2Volume", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-sky-600 text-xs font-mono font-semibold focus:outline-none focus:border-teal-500"
                            placeholder="無"
                          />
                        </td>
                        {/* Temp cell */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            value={point.temperature !== null ? point.temperature : ""}
                            onChange={(e) => handleUpdateCell(point.id, "temperature", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-orange-600 text-xs font-mono font-semibold focus:outline-none focus:border-teal-500"
                            placeholder="無"
                          />
                        </td>
                        {/* pH cell */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={point.ph !== null ? point.ph : ""}
                            onChange={(e) => handleUpdateCell(point.id, "ph", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-teal-600 text-xs font-mono font-semibold focus:outline-none focus:border-teal-500"
                            placeholder="無"
                          />
                        </td>
                        {/* Notes cell */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={point.notes}
                            onChange={(e) => handleUpdateCell(point.id, "notes", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-600 text-xs focus:outline-none focus:border-teal-500"
                            placeholder="新增備註說明"
                          />
                        </td>
                        {/* Delete btn */}
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteRow(point.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                            title="刪除此列"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {dataPoints.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-6 text-slate-400 font-semibold bg-slate-50/50">
                          目前數據表為空，您可以點擊「新增測量點」或使用 AI 辨識自動填入數據。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: AI SCIENTIFIC DISCUSSION REPORT */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6" id="report-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-teal-50 p-2.5 rounded-lg text-teal-600 border border-teal-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">🔬 AI 實驗報告與探討生成器</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  根據數據表中的時序數據，運用 Gemini AI 自動進行科學原理分析、假說驗證，產出深度報告
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport || dataPoints.length === 0}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-sm hover:shadow-teal-500/10 text-xs shrink-0"
            >
              {generatingReport ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  撰寫深度報告中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  產生 AI 實驗探討與分析報告
                </>
              )}
            </button>
          </div>

          {/* Report Display Stage */}
          {generatingReport && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin mb-2"></div>
              <p className="text-sm font-semibold text-slate-700">正在分析二氧化碳與環境因子的連動趨勢...</p>
              <p className="text-xs text-slate-400 max-w-md">
                AI 正在結合酵素催化動力學、化學平衡與酸鹼理論，為您的實驗數據建立多維度科學探討報告。
              </p>
            </div>
          )}

          {reportError && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p>{reportError}</p>
            </div>
          )}

          {reportMarkdown && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4 animate-fade-in text-left">
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-200 pb-3">
                <span className="font-mono font-bold uppercase tracking-wider text-[10px]">REPORT GENERATED BY GEMINI 3.5 FLASH</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reportMarkdown);
                    alert("報告已複製到剪貼簿！");
                  }}
                  className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  複製報告文本
                </button>
              </div>

              {/* Render simple parsed markdown formatting with high contrast style */}
              <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                {reportMarkdown.split("\n\n").map((paragraph, index) => {
                  // Basic header detection and list formatting
                  if (paragraph.startsWith("#")) {
                    const level = paragraph.match(/^#+/)?.[0].length || 1;
                    const text = paragraph.replace(/^#+\s*/, "");
                    const headerClasses = level === 1 ? "text-lg font-bold text-slate-900 mt-4 first:mt-0 pb-1 border-b border-slate-200" :
                                          level === 2 ? "text-base font-bold text-teal-600 mt-3" : "text-sm font-bold text-slate-800";
                    return React.createElement(`h${Math.min(level + 1, 6)}`, { key: index, className: headerClasses }, text);
                  }
                  if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
                    return (
                      <ul key={index} className="list-disc pl-5 space-y-1.5 text-slate-600">
                        {paragraph.split("\n").map((line, lIndex) => (
                          <li key={lIndex}>{line.replace(/^[-*]\s*/, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (/^\d+\.\s/.test(paragraph)) {
                    return (
                      <ol key={index} className="list-decimal pl-5 space-y-1.5 text-slate-600">
                        {paragraph.split("\n").map((line, lIndex) => (
                          <li key={lIndex}>{line.replace(/^\d+\.\s*/, "")}</li>
                        ))}
                      </ol>
                    );
                  }
                  return (
                    <p key={index} className="leading-relaxed">
                      {paragraph.split("\n").map((line, key) => (
                        <React.Fragment key={key}>
                          {line}
                          {key < paragraph.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {!reportMarkdown && !generatingReport && (
            <div className="py-8 bg-slate-50 border border-slate-200/60 border-dashed rounded-lg text-center flex flex-col items-center justify-center text-slate-400 gap-2">
              <ClipboardList className="w-8 h-8 text-slate-300" />
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                尚未生成報告。點擊右上方的<b>「產生 AI 實驗探討與分析報告」</b>，AI 將根據現有數據自動寫出完整的討論。
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer credits and information */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 max-w-7xl mx-auto px-4 mt-6">
        <p>© 2026 CO₂ 實驗數據自動化分析助理 - Powered by Google AI Studio & Gemini 3.5 Flash</p>
        <p className="mt-1 text-slate-400">
          專為中學及大專院校科學探究、生物與化學實驗設計，支援排水集氣量筒、溫度計、pH計實物拍攝與自動化記錄
        </p>
      </footer>

      {/* Footer Status Bar matching the original Geometric Balance theme */}
      <footer className="h-10 bg-slate-900 text-slate-400 text-[10px] flex items-center px-8 justify-between shrink-0">
        <div className="flex gap-4">
          <span>SYSTEM: <span className="text-green-400 font-bold">CONNECTED</span></span>
          <span>GOOGLE AI STUDIO: <span className="text-white font-bold">ONLINE</span></span>
          <span>SENSORS: <span className="text-white font-bold">CALIBRATED</span></span>
        </div>
        <div className="font-mono">
          LOG_TIME: {new Date().toISOString().slice(0, 10)} {new Date().toISOString().slice(11, 19)} UTC
        </div>
      </footer>
    </div>
  );
}
