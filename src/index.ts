#!/usr/bin/env node
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";
const TARGET_PORT = "3001"; // OpenClaw escuchará aquí internamente

// 1. Servidor Proxy Nativo (Sin librerías externas)
const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });
  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('OpenClaw está arrancando...');
  });
});

// Manejo de WebSockets (Crucial para OpenClaw)
server.on('upgrade', (req, socket, head) => {
  console.log("[Render-Proxy] Upgrade a WebSocket detectado");
  // Redirección simple de socket
  const targetSocket = require('node:net').connect(TARGET_PORT, '127.0.0.1', () => {
    targetSocket.write(head);
    socket.pipe(targetSocket).pipe(socket);
  });
  targetSocket.on('error', () => socket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Render-Proxy] ¡PUERTO ABIERTO! Escuchando en 0.0.0.0:${PORT}`);
});

// 2. Lanzar OpenClaw en el puerto interno
console.log("[Render-Proxy] Lanzando OpenClaw en puerto interno 3001...");
const openclaw = spawn("npx", ["tsx", "index-original.ts", "--port", TARGET_PORT, "--host", "127.0.0.1"], {
  stdio: "inherit",
  shell: true
});

openclaw.on("exit", (code) => process.exit(code || 0));
