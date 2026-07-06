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

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ZANA Server is running on port ${PORT}`);
  });
}
