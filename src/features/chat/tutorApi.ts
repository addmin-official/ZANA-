import { ZanaApiClient, ChatResponse } from "../../services/apiClient.ts";
import { ChatMessage, StudentProfile } from "../../services/storage.ts";

export async function sendChatMessageToZana(
  message: string,
  history: ChatMessage[],
  profile: StudentProfile
): Promise<ChatResponse> {
  return ZanaApiClient.sendChatMessage(message, history, profile);
}
