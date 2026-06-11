import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error";
import { apiLimiter } from "./middleware/rateLimit";
import apiRouter from "./routes";

export function createApp() {
  const app = express();

  // Render (and most PaaS) puts the app behind one reverse proxy. Trusting a
  // single hop lets express-rate-limit read the real client IP from
  // X-Forwarded-For instead of bucketing every tenant under the proxy's IP.
  app.set("trust proxy", 1);

  // Security headers.
  app.use(helmet());

  // CORS — allow the configured frontend origin and the widget's API key header.
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    }),
  );

  // Body parsing.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Baseline rate limiting across the API surface.
  app.use("/api", apiLimiter);

  // Routes.
  app.use("/api", apiRouter);

  // 404 + centralized error handling (last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
