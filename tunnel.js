const net = require('node:net');
const { spawn } = require('node:child_process');

const PORT = process.env.PORT || 3000;
const INTERNAL_PORT = 3001;

// Creamos un servidor que escucha en 0.0.0.0 (lo que Render necesita)
const server = net.createServer((socket) => {
    // Redirigimos todo al OpenClaw interno
    const client = net.connect(INTERNAL_PORT, '127.0.0.1', () => {
        socket.pipe(client).pipe(socket);
    });
    client.on('error', () => socket.destroy());
    socket.on('error', () => client.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Render-Proxy] Puerto ${PORT} abierto en 0.0.0.0. ¡Escaneo de Render debería pasar ahora!`);
    
    // Lanzamos el proceso real de OpenClaw en el puerto 3001
    const openclaw = spawn('npx', ['tsx', 'src/index.ts', '--port', INTERNAL_PORT.toString(), '--host', '127.0.0.1'], {
        stdio: 'inherit',
        shell: true
    });

    openclaw.on('exit', (code) => process.exit(code || 0));
});
