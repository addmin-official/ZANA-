import { onRequest } from "firebase-functions/v2/https";
import { app } from "../../src/server/app.ts";

export const api = onRequest(
  {
    secrets: ["GEMINI_API_KEY"],
    maxInstances: 10,
  },
  app
);
