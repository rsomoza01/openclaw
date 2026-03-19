#!/usr/bin/env node
import http from "node:http";
import httpProxy from "http-proxy"; // Necesitas: npm install http-proxy
import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";

// 1. Creamos un Proxy que escucha en 0.0.0.0:3000 (Lo que Render quiere)
const proxy = httpProxy.createProxyServer({ ws: true });

const server = http.createServer((req, res) => {
  // Redirige peticiones HTTP normales al puerto interno de OpenClaw
  proxy.web(req, res, { target: 'http://127.0.0.1:3000' });
});

// Esto es vital para que funcionen los WebSockets de OpenClaw
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:3000' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Render-Proxy] Escuchando en 0.0.0.0:${PORT} y redirigiendo a OpenClaw interno...`);
});

// 2. Lanzamos OpenClaw como un proceso hijo (pero le cambiamos el puerto para que no choque)
// Si el Proxy usa el 3000, le diremos a OpenClaw que use el 4000 internamente
console.log("[Render-Proxy] Iniciando OpenClaw original...");

const openclaw = spawn("npx", ["tsx", "index-original.ts", "--port", "3000", "--host", "127.0.0.1"], {
  stdio: "inherit",
  shell: true
});

openclaw.on("exit", (code) => {
  console.log(`OpenClaw terminó con código ${code}`);
  process.exit(code);
});
