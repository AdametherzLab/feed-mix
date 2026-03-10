import { startServer } from './server.js';

/**
 * Entry point for the Feed Mix web UI server.
 * Starts the HTTP server on the port specified by PORT environment variable or default 3000.
 */
startServer(parseInt(process.env.PORT || '3000', 10));