const net = require('node:net');
const { spawn } = require('node:child_process');

const PORT = process.env.PORT || 3000;
const INTERNAL_PORT = 3001; // Mudamos OpenClaw a este puerto para que no choque

// Creamos un servidor que escucha en 0.0.0.0 (lo que Render necesita ver)
const server = net.createServer((socket) => {
    // Redirigimos el tráfico al puerto donde realmente estará OpenClaw
    const client = net.connect(INTERNAL_PORT, '127.0.0.1', () => {
        socket.pipe(client).pipe(socket);
    });
    client.on('error', () => socket.destroy());
    socket.on('error', () => client.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Render-Proxy] Puerto ${PORT} ABIERTO en 0.0.0.0. Render ya puede detectarnos.`);
    
    // Lanzamos el proceso original de OpenClaw en el puerto interno 3001
    console.log(`[Render-Proxy] Lanzando OpenClaw en 127.0.0.1:${INTERNAL_PORT}...`);
    const openclaw = spawn('npx', ['tsx', 'src/index.ts', '--port', INTERNAL_PORT.toString(), '--host', '127.0.0.1'], {
        stdio: 'inherit',
        shell: true
    });

    openclaw.on('exit', (code) => process.exit(code || 0));
});
