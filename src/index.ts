#!/usr/bin/env node

// 1. PRIORIDAD MÁXIMA: Parches de red antes que cualquier otra cosa
import process from "node:process";
import net from "node:net";

// Forzamos 0.0.0.0 a nivel de socket de Node
const originalListen = net.Server.prototype.listen;
// @ts-ignore
net.Server.prototype.listen = function(...args: any[]) {
  if (typeof args[1] === 'string' && (args[1] === '127.0.0.1' || args[1] === 'localhost' || args[1] === '::1')) {
    console.log(`[Render-Fix] Interceptado intento de escucha en ${args[1]}. Redirigiendo a 0.0.0.0`);
    args[1] = '0.0.0.0';
  }
  return originalListen.apply(this, args);
};

// Forzamos variables de entorno globales
process.env.HOST = "0.0.0.0";
process.env.PORT = "3000";
process.env.OPENCLAW_HOST = "0.0.0.0";
process.env.OPENCLAW_PORT = "3000";

// 2. IMPORTS de sistema
import { fileURLToPath } from "node:url";

// 3. IMPORTS del proyecto (después de los parches)
import { formatUncaughtError } from "./infra/errors.js";
import { isMainModule } from "./infra/is-main.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";

const library = await import("./library.js");

// Re-exports
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
  // Quitamos la línea de installGcaughtException que daba error
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

  // Forzamos los argumentos que el CLI leerá al final
  const forcedArgs = [
    process.argv[0], 
    process.argv[1], 
    "--port", "3000",
    "--host", "0.0.0.0"
  ];

  console.log("[Render-Fix] Iniciando OpenClaw forzado en http://0.0.0.0:3000");

  void runLegacyCliEntry(forcedArgs).catch((err) => {
    console.error("[openclaw] CLI failed:", formatUncaughtError(err));
    process.exit(1);
  });
}
