#!/usr/bin/env node

import { DevtoolsServer } from './server/index.js';

function parseArgs(): { port: number; host: string } {
    const args = process.argv.slice(2);
    let port = 4000;
    let host = 'localhost';

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--port' || arg === '-p') {
            const portValue = parseInt(args[i + 1]);
            if (!isNaN(portValue)) {
                port = portValue;
                i++; // Skip the next argument as it's the port value
            }
        } else if (arg === '--host' || arg === '-h') {
            const hostValue = args[i + 1];
            if (hostValue) {
                host = hostValue;
                i++; // Skip the next argument as it's the host value
            }
        } else if (arg === '--help') {
            console.log(`
                Reflex Devtools CLI

                Usage: reflex-devtools [options]

                Options:
                -p, --port <port>    Port to run the server on (default: 4000)
                -h, --host <host>    Host to bind the server to (default: localhost)
                --help              Show this help message

                Examples:
                reflex-devtools                    # Start on localhost:4000
                reflex-devtools --port 3000        # Start on localhost:3000
                reflex-devtools --host 0.0.0.0     # Start on 0.0.0.0:4000
      `);
            process.exit(0);
        }
    }

    return { port, host };
}

async function main() {
    const { port, host } = parseArgs();

    const server = new DevtoolsServer({ port, host });

    let isShuttingDown = false;

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            // If already shutting down, force exit after a short delay
            console.log(`[Reflex Devtools] Force exiting...`);
            setTimeout(() => process.exit(1), 1000);
            return;
        }
        
        isShuttingDown = true;
        console.log(`[Reflex Devtools] Received ${signal}, shutting down gracefully...`);
        
        try {
            await server.stop();
            console.log('[Reflex Devtools] Server stopped.');
            process.exit(0);
        } catch (err) {
            console.error('[Reflex Devtools] Error during shutdown:', err);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    try {
        await server.start();
    } catch (error) {
        console.error('[Reflex Devtools] Failed to start server:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('[Reflex Devtools] Unexpected error:', error);
    process.exit(1);
}); 