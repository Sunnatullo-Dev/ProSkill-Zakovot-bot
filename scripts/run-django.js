// Django dev serverini ishga tushiradi.
// Venv mavjud bo'lsa undan foydalanadi; aks holda system Python'ga tushadi.
// Bu skript Windows'da `cd && .venv/Scripts/python.exe` shell yo'l muammosini
// chetlab o'tish uchun absolyut yo'l va aniq cwd ishlatadi.

const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "..");
const backendDir = path.join(root, "backend-django");

if (!fs.existsSync(backendDir)) {
  console.error(`\n[django] backend-django/ topilmadi: ${backendDir}`);
  process.exit(1);
}

const isWindows = process.platform === "win32";
const venvPython = path.join(
  backendDir,
  ".venv",
  isWindows ? "Scripts" : "bin",
  isWindows ? "python.exe" : "python"
);

let python = venvPython;
let usingVenv = true;

if (!fs.existsSync(venvPython)) {
  // Venv yo'q — system Python'ga tushamiz.
  const candidates = isWindows ? ["py", "python", "python3"] : ["python3", "python"];
  python = null;
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { stdio: "ignore" });
    if (result.status === 0) {
      python = candidate;
      break;
    }
  }
  usingVenv = false;

  if (!python) {
    console.error("\n[django] Python topilmadi. Iltimos Python 3.11+ o'rnating yoki venv tayyorlang:");
    console.error("  cd backend-django");
    console.error("  python -m venv .venv");
    console.error("  .venv/Scripts/python.exe -m pip install -r requirements.txt\n");
    process.exit(1);
  }
}

console.log(
  `[django] Python: ${python}${usingVenv ? " (venv)" : " (system)"} — port ${process.env.PORT || "3000"}`
);

const port = process.env.PORT || "3000";
const child = spawn(python, ["manage.py", "runserver", port, "--noreload"], {
  cwd: backendDir,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
