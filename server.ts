import express from "express";
import path from "path";
import { app } from "./src/server/app.ts";

export {
  app,
  classifyError,
  getClientSafeErrorMessage,
  logMinimalError,
  UploadValidationError,
  fileFilter,
  rateLimitDb,
  isRateLimited,
} from "./src/server/app.ts";

const PORT = 3000;

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite only during development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production/local start, serve compiled dist assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ZANA Server is running on port ${PORT}`);
    });
  }
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap ZANA local server:", err);
});
