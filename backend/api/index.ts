/**
 * Vercel serverless entry point.
 *
 * Vercel runs this file as a function and invokes the default export per
 * request. An Express app instance is itself a (req, res) handler, so we export
 * the built app directly — NO app.listen() here (the platform manages that;
 * server.ts is only for local/persistent hosting).
 *
 * vercel.json rewrites every path to this function, so Express still sees the
 * original URL (e.g. /api/auth/login) and routes normally.
 */
import { createApp } from "../src/app";

const app = createApp();

export default app;
