import express from "express";
import path from "path";
import fs from "fs";
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
    // Dynamically import Vite only during local development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static production serving
    const clientPath = path.join(process.cwd(), "dist", "client");
    const distPath = fs.existsSync(clientPath) ? clientPath : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ZANA Server running on port ${PORT}`);
    });
  }
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap ZANA local server:", err);
});
