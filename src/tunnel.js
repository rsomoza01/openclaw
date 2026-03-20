const net = require('node:net');
const { spawn } = require('node:child_process');

const PORT = process.env.PORT || 3000;
const INTERNAL_PORT = 3001;

// 1. Creamos un túnel TCP simple de 0.0.0.0 a 127.0.0.1
const server = net.createServer((socket) => {
    const client = net.connect(INTERNAL_PORT, '127.0.0.1', () => {
        socket.pipe(client).pipe(socket);
    });
    client.on('error', () => socket.destroy());
    socket.on('error', () => client.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Render-Fix] PUERTO ${PORT} ABIERTO EN 0.0.0.0 (Render ya puede vernos)`);
    
    // 2. Lanzamos OpenClaw en el puerto interno 3001
    console.log(`[Render-Fix] Lanzando OpenClaw en 127.0.0.1:${INTERNAL_PORT}...`);
    const openclaw = spawn('npx', ['tsx', 'index.ts', '--port', INTERNAL_PORT.toString(), '--host', '127.0.0.1'], {
        stdio: 'inherit',
        shell: true
    });

    openclaw.on('exit', (code) => process.exit(code || 0));
});
