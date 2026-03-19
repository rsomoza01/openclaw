#!/usr/bin/env node
import process from "node:process";

// --- LIMPIEZA TOTAL DE ARGUMENTOS ---
// Borramos cualquier rastro de configuración previa y forzamos el Host Global
process.env.HOST = "0.0.0.0";
process.env.PORT = "3000";

// Reemplazamos los argumentos del proceso para que OpenClaw solo vea estos
process.argv = [
  process.argv[0], 
  process.argv[1], 
  "--host", "0.0.0.0", 
  "--port", "3000"
];
// ------------------------------------

import { fileURLToPath } from "node:url";
import net from "node:net"; // <--- Añade este import

// --- EL TRUCO FINAL PARA RENDER ---
// Forzamos a que cualquier intento de escuchar en '127.0.0.1' se convierta en '0.0.0.0'
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function(...args: any[]) {
  if (typeof args[1] === 'string' && (args[1] === '127.0.0.1' || args[1] === 'localhost')) {
    args[1] = '0.0.0.0';
  }
  return originalListen.apply(this, args);
};

// --- FORZADO AGRESIVO ---
// Esto sobrescribe cualquier configuración interna que busque estas variables
process.env.OPENCLAW_PORT = "3000"; // Algunos sistemas usan prefijos
process.env.OPENCLAW_HOST = "0.0.0.0";

// También modificamos los argumentos por si acaso
process.argv.push("--port", "3000", "--host", "0.0.0.0");
// ------------------------

// --- BLOQUE DE FORZADO DE PUERTO PARA RENDER ---
const RENDER_PORT = process.env.PORT || "3000";
if (!process.argv.includes("--port")) {
  process.argv.push("--port", RENDER_PORT);
}
if (!process.argv.includes("--host")) {
  process.argv.push("--host", "0.0.0.0");
}
// -----------------------------------------------

import { formatUncaughtError } from "./infra/errors.js";
import { isMainModule } from "./infra/is-main.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";

const library = await import("./library.js");

export const assertWebChannel = library.assertWebChannel;
export const applyTemplate = library.applyTemplate;
export const createDefaultDeps = library.createDefaultDeps;
export const deriveSessionKey = library.deriveSessionKey;
export const describePortOwner = library.describePortOwner;
export const ensureBinary = library.ensureBinary;
export const ensurePortAvailable = library.ensurePortAvailable;
export const getReplyFromConfig = library.getReplyFromConfig;
export const handlePortError = library.handlePortError;
export const loadConfig = library.loadConfig;
export const loadSessionStore = library.loadSessionStore;
export const monitorWebChannel = library.monitorWebChannel;
export const normalizeE164 = library.normalizeE164;
export const PortInUseError = library.PortInUseError;
export const promptYesNo = library.promptYesNo;
export const resolveSessionKey = library.resolveSessionKey;
export const resolveStorePath = library.resolveStorePath;
export const runCommandWithTimeout = library.runCommandWithTimeout;
export const runExec = library.runExec;
export const saveSessionStore = library.saveSessionStore;
export const toWhatsappJid = library.toWhatsappJid;
export const waitForever = library.waitForever;

type LegacyCliDeps = {
  installGaxiosFetchCompat: () => Promise<void>;
  runCli: (argv: string[]) => Promise<void>;
};

async function loadLegacyCliDeps(): Promise<LegacyCliDeps> {
  const [{ installGaxiosFetchCompat }, { runCli }] = await Promise.all([
    import("./infra/gaxios-fetch-compat.js"),
    import("./cli/run-main.js"),
  ]);
  return { installGaxiosFetchCompat, runCli };
}

export async function runLegacyCliEntry(
  argv: string[] = process.argv,
  deps?: LegacyCliDeps,
): Promise<void> {
  const { installGaxiosFetchCompat, runCli } = deps ?? (await loadLegacyCliDeps());
  await installGcaughtException(); // Si tenías esto, déjalo
  await installGaxiosFetchCompat();
  await runCli(argv);
}

const isMain = isMainModule({
  currentFile: fileURLToPath(import.meta.url),
});

if (isMain) {
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[openclaw] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  // --- REEMPLAZA ESTA PARTE ---
  // Ignoramos lo que venga y forzamos estos 4 argumentos
  const forcedArgs = [
    process.argv[0], // ruta de node
    process.argv[1], // ruta de index.ts
    "--port", "3000",
    "--host", "0.0.0.0"
  ];

  console.log("[Render-Fix] Forzando inicio en puerto 3000...");

  void runLegacyCliEntry(forcedArgs).catch((err) => {
    console.error("[openclaw] CLI failed:", formatUncaughtError(err));
    process.exit(1);
  });
}
