import { useState, useEffect } from "react";
import { ProgressMetrics } from "./progressTypes.ts";
import { ZanaStorage } from "../../services/storage.ts";

export function useProgress() {
  const [metrics, setMetrics] = useState<ProgressMetrics>(() => ZanaStorage.getProgress());

  const refreshMetrics = () => {
    setMetrics(ZanaStorage.getProgress());
  };

  return {
    metrics,
    refreshMetrics
  };
}
