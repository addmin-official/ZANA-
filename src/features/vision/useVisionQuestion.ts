import { useState, useEffect, useRef } from "react";
import {
  VisionImageInput,
  VisionImageSource,
  VisionProcessingStatus,
  VisionRequestMode,
  VisionSnapshot,
  VisionStudyContext
} from "./visionTypes.ts";
import { validateImageFile } from "./visionValidation.ts";
import { VisionApi } from "./visionApi.ts";
import { VisionQuestionEngine } from "./VisionQuestionEngine.ts";
import { DomainEventFactory } from "../../domain/DomainEventFactory.ts";
import { domainEventStoreInstance } from "../../domain/DomainEventStore.ts";

export function useVisionQuestion(context: VisionStudyContext) {
  const [snapshot, setSnapshot] = useState<VisionSnapshot>({
    status: "idle",
    selectedMode: "explain",
    extractedText: "",
    editableText: "",
  });

  const latestImageRef = useRef<VisionImageInput | undefined>(undefined);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (latestImageRef.current?.previewUrl) {
        VisionQuestionEngine.revokePreviewUrl(latestImageRef.current.previewUrl);
      }
    };
  }, []);

  const selectImage = (file: File, source: VisionImageSource) => {
    // Revoke previous URL if any
    if (snapshot.image?.previewUrl) {
      VisionQuestionEngine.revokePreviewUrl(snapshot.image.previewUrl);
    }

    setSnapshot(prev => ({
      ...prev,
      status: "validating",
      error: undefined,
    }));

    const valResult = validateImageFile(file);
    if (!valResult.isValid || !valResult.mimeType) {
      setSnapshot(prev => ({
        ...prev,
        status: "idle",
        error: valResult.error || "فایلەکە نادروستە.",
        image: undefined,
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newImage: VisionImageInput = {
      file,
      source,
      previewUrl,
      mimeType: valResult.mimeType,
      sizeBytes: file.size,
    };

    latestImageRef.current = newImage;

    setSnapshot(prev => ({
      ...prev,
      status: "idle",
      image: newImage,
      extractedText: "",
      editableText: "",
      result: undefined,
      error: undefined,
    }));
  };

  const removeImage = () => {
    if (snapshot.image?.previewUrl) {
      VisionQuestionEngine.revokePreviewUrl(snapshot.image.previewUrl);
    }
    latestImageRef.current = undefined;

    setSnapshot(prev => ({
      ...prev,
      status: "idle",
      image: undefined,
      extractedText: "",
      editableText: "",
      result: undefined,
      error: undefined,
    }));
  };

  const setSelectedMode = (mode: VisionRequestMode) => {
    setSnapshot(prev => ({
      ...prev,
      selectedMode: mode,
    }));
  };

  const updateEditableText = (text: string) => {
    setSnapshot(prev => ({
      ...prev,
      editableText: text,
    }));
  };

  const submitImage = async (overrideText?: string) => {
    if (!snapshot.image) {
      setSnapshot(prev => ({ ...prev, error: "تکایە وێنەیەک دیاری بکە." }));
      return;
    }

    if (snapshot.status === "uploading" || snapshot.status === "extracting") {
      return; // prevent duplicate submit
    }

    const { studentId, subject, sessionId } = context;

    // Dispatch VISION_QUESTION_SUBMITTED event
    try {
      const submitEvent = DomainEventFactory.createEvent(
        "VISION_QUESTION_SUBMITTED",
        studentId,
        "ai-tutor",
        {
          studentId,
          subject,
          sessionId,
          mode: snapshot.selectedMode,
          imageMimeType: snapshot.image.mimeType,
          imageSizeBytes: snapshot.image.sizeBytes,
        },
        { sessionId, subject }
      );
      domainEventStoreInstance.append(submitEvent);
    } catch (e) {
      console.error("Failed to append event:", e);
    }

    setSnapshot(prev => ({
      ...prev,
      status: "uploading",
      error: undefined,
    }));

    try {
      // Step 1: Call API (upload & extract)
      const apiResult = await VisionApi.processVisionQuestion(
        snapshot.image.file,
        snapshot.selectedMode,
        context,
        overrideText || snapshot.editableText || undefined
      );

      // Dispatch VISION_TEXT_EXTRACTED event
      try {
        const textEvent = DomainEventFactory.createEvent(
          "VISION_TEXT_EXTRACTED",
          studentId,
          "ai-tutor",
          {
            studentId,
            subject,
            sessionId,
            confidence: apiResult.confidence,
          },
          { sessionId, subject }
        );
        domainEventStoreInstance.append(textEvent);
      } catch (e) {
        console.error("Failed to append event:", e);
      }

      // Dispatch VISION_EXPLANATION_COMPLETED event if response text is present
      if (apiResult.responseText) {
        try {
          const completedEvent = DomainEventFactory.createEvent(
            "VISION_EXPLANATION_COMPLETED",
            studentId,
            "ai-tutor",
            {
              studentId,
              subject,
              sessionId,
              mode: snapshot.selectedMode,
            },
            { sessionId, subject }
          );
          domainEventStoreInstance.append(completedEvent);
        } catch (e) {
          console.error("Failed to append event:", e);
        }
      }

      setSnapshot(prev => ({
        ...prev,
        status: "ready",
        extractedText: apiResult.extractedText,
        editableText: prev.editableText || apiResult.extractedText,
        result: apiResult,
        error: undefined,
      }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "هەڵەیەکی نەزانراو ڕوویدا.";

      // Dispatch VISION_PROCESSING_FAILED event
      try {
        const failedEvent = DomainEventFactory.createEvent(
          "VISION_PROCESSING_FAILED",
          studentId,
          "ai-tutor",
          {
            studentId,
            subject,
            sessionId,
            error: errMsg,
          },
          { sessionId, subject }
        );
        domainEventStoreInstance.append(failedEvent);
      } catch (e) {
        console.error("Failed to append event:", e);
      }

      setSnapshot(prev => ({
        ...prev,
        status: "failed",
        error: errMsg,
      }));
    }
  };

  const reset = () => {
    removeImage();
  };

  return {
    snapshot,
    selectImage,
    removeImage,
    setSelectedMode,
    updateEditableText,
    submitImage,
    reset,
  };
}
