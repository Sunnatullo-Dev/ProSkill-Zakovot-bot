// Admin Panel uchun bulk savol fayl parseri.
// Qo'llab-quvvatlanadigan fayl turlari: .json, .csv, .tsv, .txt, .xls, .xlsx, .pdf
// Har bitta savol uchun kerakli maydonlar: text, correctAnswer.
// Ixtiyoriy: category, difficulty (easy|medium|hard).

import type { Difficulty } from "../types";

export type ParsedQuestion = {
  text: string;
  correctAnswer: string;
  category: string | null;
  difficulty: Difficulty | null;
};

export type ParseError = {
  row: number;
  reason: string;
};

export type ParseResult = {
  format: string;
  valid: ParsedQuestion[];
  invalid: ParseError[];
};

const TEXT_KEYS = ["text", "savol", "savol_matni", "question", "q"];
const ANSWER_KEYS = [
  "correctanswer",
  "correct_answer",
  "answer",
  "javob",
  "javobi",
  "togri_javob",
  "to'g'ri_javob",
  "a"
];
const CATEGORY_KEYS = ["category", "kategoriya", "fan", "mavzu"];
const DIFFICULTY_KEYS = ["difficulty", "qiyinlik", "level", "daraja"];

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  easy: "easy",
  oson: "easy",
  medium: "medium",
  "o'rta": "medium",
  orta: "medium",
  hard: "hard",
  qiyin: "hard"
};

export async function parseQuestionsFile(file: File): Promise<ParseResult> {
  const ext = extractExtension(file.name);

  if (ext === "json") {
    const text = await readFileAsText(file);
    return parseJson(text);
  }

  if (ext === "csv") {
    const text = await readFileAsText(file);
    return parseDelimited(text, ",", "CSV");
  }

  if (ext === "tsv") {
    const text = await readFileAsText(file);
    return parseDelimited(text, "\t", "TSV");
  }

  if (ext === "txt") {
    const text = await readFileAsText(file);
    return parseText(text);
  }

  if (ext === "xls" || ext === "xlsx") {
    return parseSpreadsheet(file);
  }

  if (ext === "pdf") {
    return parsePdf(file);
  }

  // Tanilmagan kengaytma — matn deb urinib ko'ramiz.
  const text = await readFileAsText(file);
  return parseText(text);
}

// Faylni avval UTF-8 dek o'qiymiz; agar U+FFFD belgilar paydo bo'lsa
// (fayl boshqa encoding'da, masalan Windows-1251), Windows-1251 va
// koeyin ISO-8859-1 bilan urinamiz. Bu Cyrillic matnli .csv/.txt
// fayllar uchun muhim.
async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const candidates = ["utf-8", "windows-1251", "iso-8859-1"];

  let bestText = "";
  let bestScore = -Infinity;

  for (const encoding of candidates) {
    try {
      const text = new TextDecoder(encoding).decode(buffer);
      const score = scoreEncoding(text);

      if (score > bestScore) {
        bestText = text;
        bestScore = score;
      }
    } catch {
      // TextDecoder shu encoding'ni qo'llab-quvvatlamasa — keyingisi.
    }
  }

  return bestText || new TextDecoder("utf-8").decode(buffer);
}

// Encoding'ni baholash: U+FFFD belgilar va boshqa diakritik chiqindilar
// kam bo'lgan variant g'olib. Agar matn lotin alifbosi yoki kirill harflari
// ko'p bo'lsa — yaxshi belgisi.
function scoreEncoding(text: string): number {
  if (!text) {
    return -Infinity;
  }

  let replacements = 0;
  let printable = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0xfffd) {
      replacements += 1;
      continue;
    }
    // Lotin, kirill, raqam, tinish, bo'sh joy, yangi qator — "yaxshi".
    if (
      (code >= 0x20 && code <= 0x7e) || // ASCII printable
      (code >= 0x400 && code <= 0x4ff) || // Cyrillic
      (code >= 0xc0 && code <= 0x17f) || // Latin extended
      code === 0x0a ||
      code === 0x0d ||
      code === 0x09
    ) {
      printable += 1;
    }
  }

  // Replacement belgilari katta jarima.
  return printable - replacements * 50;
}

function extractExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseJson(text: string): ParseResult {
  const result: ParseResult = { format: "JSON", valid: [], invalid: [] };

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    result.invalid.push({ row: 0, reason: "JSON noto'g'ri formatda" });
    return result;
  }

  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown[] }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;

  if (!items) {
    result.invalid.push({ row: 0, reason: "Massiv yoki { questions: [...] } kutilgan" });
    return result;
  }

  items.forEach((raw, index) => {
    const row = index + 1;

    if (!raw || typeof raw !== "object") {
      result.invalid.push({ row, reason: "Obyekt emas" });
      return;
    }

    const record = raw as Record<string, unknown>;
    const text = pickString(record, TEXT_KEYS);
    const answer = pickString(record, ANSWER_KEYS);
    const category = pickString(record, CATEGORY_KEYS);
    const difficulty = pickString(record, DIFFICULTY_KEYS);

    const built = buildQuestion({ text, answer, category, difficulty });

    if (built.ok) {
      result.valid.push(built.value);
    } else {
      result.invalid.push({ row, reason: built.reason });
    }
  });

  return result;
}

function parseDelimited(text: string, delimiter: string, format: string): ParseResult {
  const result: ParseResult = { format, valid: [], invalid: [] };
  const rows = splitCsv(text, delimiter);

  if (rows.length === 0) {
    result.invalid.push({ row: 0, reason: "Fayl bo'sh" });
    return result;
  }

  const headers = rows[0].map((cell) => normalizeKey(cell));
  const idx = {
    text: findHeader(headers, TEXT_KEYS),
    answer: findHeader(headers, ANSWER_KEYS),
    category: findHeader(headers, CATEGORY_KEYS),
    difficulty: findHeader(headers, DIFFICULTY_KEYS)
  };

  if (idx.text === -1 || idx.answer === -1) {
    result.invalid.push({
      row: 1,
      reason: "Sarlavhada 'text/savol' va 'answer/javob' ustunlari topilmadi"
    });
    return result;
  }

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];

    if (cells.length === 0 || cells.every((cell) => cell.trim() === "")) {
      continue;
    }

    const built = buildQuestion({
      text: cells[idx.text] ?? "",
      answer: cells[idx.answer] ?? "",
      category: idx.category >= 0 ? cells[idx.category] ?? "" : "",
      difficulty: idx.difficulty >= 0 ? cells[idx.difficulty] ?? "" : ""
    });

    if (built.ok) {
      result.valid.push(built.value);
    } else {
      result.invalid.push({ row: i + 1, reason: built.reason });
    }
  }

  return result;
}

function parseText(text: string): ParseResult {
  const result: ParseResult = { format: "TXT", valid: [], invalid: [] };
  const lines = text.split(/\r?\n/);

  // Avval pipe-separator (`|`, `→`, `=>`) bilan parse qilamiz.
  const separated = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => line.length > 0);

  let parsedAny = false;

  for (const { line, index } of separated) {
    const parts = splitByAnyOf(line, ["|", "→", "=>", ";;"]);

    if (parts.length >= 2) {
      const built = buildQuestion({
        text: parts[0],
        answer: parts[1],
        category: parts[2] ?? "",
        difficulty: parts[3] ?? ""
      });

      if (built.ok) {
        result.valid.push(built.value);
        parsedAny = true;
      } else {
        result.invalid.push({ row: index + 1, reason: built.reason });
      }
    }
  }

  if (parsedAny) {
    return result;
  }

  // Pipe topilmasa — blok shaklida parse qilib ko'ramiz (har 2-4 qator = 1 savol).
  const blocks = text.split(/\r?\n\s*\r?\n/);

  blocks.forEach((block, index) => {
    const blockLines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (blockLines.length === 0) {
      return;
    }

    if (blockLines.length < 2) {
      result.invalid.push({
        row: index + 1,
        reason: "Savol uchun matn va javob kerak"
      });
      return;
    }

    const built = buildQuestion({
      text: blockLines[0],
      answer: blockLines[1],
      category: blockLines[2] ?? "",
      difficulty: blockLines[3] ?? ""
    });

    if (built.ok) {
      result.valid.push(built.value);
    } else {
      result.invalid.push({ row: index + 1, reason: built.reason });
    }
  });

  return result;
}

async function parsePdf(file: File): Promise<ParseResult> {
  const result: ParseResult = { format: "PDF", valid: [], invalid: [] };

  // pdfjs-dist ni dinamik yuklash (bundle hajmini kamaytirish uchun)
  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).href;
  } catch {
    result.invalid.push({ row: 0, reason: "PDF kutubxonasini yuklab bo'lmadi" });
    return result;
  }

  try {
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();

      // Y koordinatasi asosida yangi qatorlarni aniqlash
      let lastY: number | null = null;
      let lineText = "";

      for (const item of content.items) {
        if (!("str" in item)) continue;
        const { str, transform } = item as { str: string; transform: number[] };
        const y = Math.round(transform[5]);

        if (lastY !== null && Math.abs(y - lastY) > 1) {
          fullText += lineText.trim() + "\n";
          lineText = "";
        }
        lineText += str;
        lastY = y;
      }
      if (lineText.trim()) fullText += lineText.trim() + "\n";
      fullText += "\n";
    }

    return parseSavolJavob(fullText, result);
  } catch {
    result.invalid.push({ row: 0, reason: "PDF o'qib bo'lmadi yoki fayl buzilgan" });
    return result;
  }
}

// SAVOL: ... \n JAVOB: ... formatini parse qiladi.
// Shuningdek "1. Savol | Javob" va oddiy matn formatini ham qo'llab-quvvatlaydi.
function parseSavolJavob(text: string, result: ParseResult): ParseResult {
  const savolJavobRe = /SAVOL\s*:\s*([\s\S]*?)JAVOB\s*:\s*([\s\S]*?)(?=SAVOL\s*:|$)/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = savolJavobRe.exec(text)) !== null) {
    idx++;
    const questionText = match[1].trim().replace(/\s+/g, " ");
    const answerText = match[2].trim().replace(/\s+/g, " ");

    const built = buildQuestion({
      text: questionText,
      answer: answerText,
      category: "",
      difficulty: ""
    });

    if (built.ok) {
      result.valid.push(built.value);
    } else {
      result.invalid.push({ row: idx, reason: built.reason });
    }
  }

  if (idx > 0) return result;

  // SAVOL:/JAVOB: topilmasa — matn formatini sinab ko'ramiz
  const fallback = parseText(text);
  return { ...fallback, format: "PDF" };
}

async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const result: ParseResult = { format: "Excel", valid: [], invalid: [] };

  let XLSX: typeof import("xlsx");

  try {
    XLSX = await import("xlsx");
  } catch (error) {
    result.invalid.push({ row: 0, reason: "Excel kutubxonasini yuklab bo'lmadi" });
    return result;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    result.invalid.push({ row: 0, reason: "Excel ichida sheet topilmadi" });
    return result;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    result.invalid.push({ row: 0, reason: "Sheet bo'sh" });
    return result;
  }

  // Sheet -> json natijasidagi key'lar — ustun sarlavhalari. Normalizatsiya qilamiz.
  const sampleKeys = Object.keys(rows[0]).map(normalizeKey);

  if (
    findHeader(sampleKeys, TEXT_KEYS) === -1 ||
    findHeader(sampleKeys, ANSWER_KEYS) === -1
  ) {
    result.invalid.push({
      row: 1,
      reason: "Sarlavhada 'text/savol' va 'answer/javob' ustunlari topilmadi"
    });
    return result;
  }

  rows.forEach((rawRow, index) => {
    const row = index + 2;
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rawRow)) {
      normalized[normalizeKey(key)] = value;
    }

    const text = pickString(normalized, TEXT_KEYS);
    const answer = pickString(normalized, ANSWER_KEYS);
    const category = pickString(normalized, CATEGORY_KEYS);
    const difficulty = pickString(normalized, DIFFICULTY_KEYS);

    const built = buildQuestion({ text, answer, category, difficulty });

    if (built.ok) {
      result.valid.push(built.value);
    } else {
      result.invalid.push({ row, reason: built.reason });
    }
  });

  return result;
}

type BuildInput = {
  text: string;
  answer: string;
  category: string;
  difficulty: string;
};

type BuildResult = { ok: true; value: ParsedQuestion } | { ok: false; reason: string };

function buildQuestion(input: BuildInput): BuildResult {
  const text = input.text.trim();
  const answer = input.answer.trim();

  if (text.length < 3) {
    return { ok: false, reason: "Savol matni qisqa yoki yo'q" };
  }

  if (answer.length < 1) {
    return { ok: false, reason: "Javob yo'q" };
  }

  const category = input.category.trim();
  const difficultyRaw = input.difficulty.trim().toLowerCase();
  const difficulty = difficultyRaw ? (DIFFICULTY_MAP[difficultyRaw] ?? null) : null;

  return {
    ok: true,
    value: {
      text,
      correctAnswer: answer,
      category: category.length > 0 ? category : null,
      difficulty
    }
  };
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = record[key];

    if (typeof direct === "string" && direct.trim() !== "") {
      return direct;
    }

    if (typeof direct === "number") {
      return String(direct);
    }
  }

  // Ham normallashtirilgan kalitlar bilan tekshirib chiqamiz.
  for (const rawKey of Object.keys(record)) {
    const normalized = normalizeKey(rawKey);

    if (keys.includes(normalized)) {
      const value = record[rawKey];

      if (typeof value === "string") {
        return value;
      }

      if (typeof value === "number") {
        return String(value);
      }
    }
  }

  return "";
}

function findHeader(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    if (candidates.includes(headers[i])) {
      return i;
    }
  }

  return -1;
}

// Kichik CSV/TSV parseri: tirnoqlar va escape'larni hisobga oladi.
function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === delimiter) {
      current.push(cell);
      cell = "";
      i += 1;
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      current.push(cell);
      rows.push(current);
      current = [];
      cell = "";
      i += 1;
      continue;
    }

    cell += char;
    i += 1;
  }

  if (cell.length > 0 || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }

  return rows;
}

function splitByAnyOf(line: string, separators: string[]): string[] {
  for (const sep of separators) {
    if (line.includes(sep)) {
      return line.split(sep).map((part) => part.trim());
    }
  }

  return [];
}
