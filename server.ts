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

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

async function bootstrapLocalServer(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "The Express adapter is local-development-only. Production must run on Cloudflare Worker and Static Assets.",
    );
  }

  if (process.env.NODE_ENV === "test") return;

  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`ZANA local development server is running on port ${PORT}`);
  });
}

void bootstrapLocalServer().catch(() => {
  process.exitCode = 1;
});
