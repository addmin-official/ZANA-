import { useState, useEffect, useCallback, useRef } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { AskContext, AskMessage, AskSnapshot, SuggestedQuestion } from "./askTypes.ts";
import {
  buildAskContext,
  generateSuggestedQuestions,
  getSessionHistory,
  saveSessionHistory,
  clearSessionHistory as clearSessionStorage
} from "./AskModeEngine.ts";
import { askZana } from "./askApi.ts";
import { DomainEventFactory } from "../../../domain/DomainEventFactory.ts";
import { domainEventBusInstance } from "../../../domain/DomainEventBus.ts";

export function useAskMode(
  profile: StudentProfile,
  cipSnapshot: any,
  lseSnapshot: any
) {
  // 1. Build context
  const context = buildAskContext(profile, cipSnapshot, lseSnapshot);
  const sessionId = context.sessionId || "session_fallback";

  // 2. Local State
  const [messages, setMessages] = useState<AskMessage[]>(() => getSessionHistory(sessionId));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Suggested questions
  const conceptTitle = context.conceptTitle || "چەمکی خوێندن";
  const lessonTitle = context.lessonTitle || "وانەی ئێستا";
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);

  // Keep a ref to the current session ID to sync when it changes
  const prevSessionIdRef = useRef<string>(sessionId);

  // Sync history when sessionId changes
  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      prevSessionIdRef.current = sessionId;
      const loaded = getSessionHistory(sessionId);
      setMessages(loaded);
      setError(undefined);
      setIsSending(false);
    }
  }, [sessionId]);

  // Generate suggested questions
  useEffect(() => {
    const questions = generateSuggestedQuestions(conceptTitle, lessonTitle);
    setSuggestedQuestions(questions);
  }, [conceptTitle, lessonTitle]);

  // Save messages to history whenever they update
  useEffect(() => {
    saveSessionHistory(sessionId, messages);
  }, [messages, sessionId]);

  // Send a custom question
  const sendQuestion = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(undefined);

    // Create student message
    const studentMsgId = "msg_stud_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    const newStudentMessage: AskMessage = {
      id: studentMsgId,
      role: "student",
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: "sending"
    };

    // Update messages local state
    setMessages((prev) => [...prev, newStudentMessage].slice(-20));

    // 1. Publish Domain Event: ANSWER_SUBMITTED
    try {
      const event = DomainEventFactory.createEvent(
        "ANSWER_SUBMITTED",
        context.studentId,
        "student-portal",
        {
          questionId: studentMsgId,
          studentAnswer: trimmed,
          conceptId: context.conceptId || "unknown"
        },
        {
          grade: context.grade,
          stream: context.stream,
          subject: context.subject,
          nodeId: context.conceptId,
          sessionId: context.sessionId
        }
      );
      await domainEventBusInstance.publish(event);
    } catch (evtErr) {
      console.error("Error publishing ANSWER_SUBMITTED domain event:", evtErr);
    }

    // 2. Prepare API payload
    const activeMessages = getSessionHistory(sessionId);
    // Include current message in the history structure sent to server
    const apiHistory = activeMessages.map(m => ({
      role: m.role,
      text: m.text
    }));

    try {
      const apiResult = await askZana({
        message: trimmed,
        history: apiHistory,
        context
      });

      // Append Zana reply
      const zanaMsgId = "msg_zana_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const newZanaMessage: AskMessage = {
        id: zanaMsgId,
        role: "zana",
        text: apiResult.text,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      setMessages((prev) => {
        // Find student message and set it as sent
        const updated = prev.map((m) =>
          m.id === studentMsgId ? { ...m, status: "sent" as const } : m
        );
        return [...updated, newZanaMessage].slice(-20);
      });
    } catch (apiErr: any) {
      setError(apiErr.message || "کێشەیەک لە کاتی وەرگرتنی وەڵامی زانادا ڕوویدا.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === studentMsgId ? { ...m, status: "failed" as const } : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [context, isSending, sessionId]);

  // Retry a failed message
  const retryMessage = useCallback(async (messageId: string) => {
    if (isSending) return;
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || targetMsg.role !== "student") return;

    // Filter out any messages after this failed message to retry cleanly
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    const textToRetry = targetMsg.text;
    
    // Remove the failed message and everything after it, then trigger sendQuestion
    setMessages((prev) => prev.slice(0, index));
    await sendQuestion(textToRetry);
  }, [messages, sendQuestion, isSending]);

  // Select Suggested Question
  const selectSuggestedQuestion = useCallback(async (question: SuggestedQuestion) => {
    await sendQuestion(question.text);
  }, [sendQuestion]);

  // Clear Session History
  const clearSessionHistory = useCallback(() => {
    clearSessionStorage(sessionId);
    setMessages([]);
    setError(undefined);
    setIsSending(false);
  }, [sessionId]);

  // Expose snapshot
  const snapshot: AskSnapshot = {
    context,
    messages,
    suggestedQuestions,
    isSending,
    error
  };

  return {
    snapshot,
    sendQuestion,
    retryMessage,
    clearSessionHistory,
    selectSuggestedQuestion,
    isSending,
    error
  };
}
