import z from "zod";

export function onPageUnload(callback: () => void): () => void {
  const handleVisibilityChange = () => {
    // Only flush when page becomes hidden (not when it becomes visible)
    if (document.hidden) {
      console.log("visibilitychange - page hidden");
      callback();
    }
  };

  const handleBeforeUnload = () => {
    console.log("beforeunload");
    callback();
  };

  const handlePageHide = () => {
    console.log("pagehide");
    callback();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pagehide", handlePageHide);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("pagehide", handlePageHide);
  };
}

type EmergencySaveData<T> = {
  data: T;
  savedAt: number;
};
const EmergencySaveData = z.object({
  data: z.unknown(),
  savedAt: z.number(),
});

function getEmergencySaveKey(key: string): string {
  return `emergency-save:${key}`;
}

export function emergencySave<T>(key: string, data: T): void {
  console.log("EMERGENCY SAVE TRIGGERED", { key, data });
  const emergencySaveKey = getEmergencySaveKey(key);
  const emergencySaveData: EmergencySaveData<T> = {
    data,
    savedAt: Date.now(),
  };
  localStorage.setItem(emergencySaveKey, JSON.stringify(emergencySaveData));
}

export function emergencyRestore<T>(
  key: string
): EmergencySaveData<T> | undefined {
  const emergencySaveKey = getEmergencySaveKey(key);
  const rawData = localStorage.getItem(emergencySaveKey);
  if (!rawData) return;
  try {
    localStorage.removeItem(emergencySaveKey);
    console.log("EMERGENCY SAVE RESTORED", { key, rawData });
    const raw: unknown = JSON.parse(rawData);
    const parsed = EmergencySaveData.parse(raw);
    return parsed as EmergencySaveData<T>;
  } catch (error) {
    console.error("Error parsing emergency save", { key, rawData, error });
  }
}

export function createEmergencySave<T>({
  key,
  getData,
  isInEmergency,
}: {
  key: string;
  getData: () => T;
  isInEmergency: () => boolean;
}) {
  onPageUnload(() => {
    if (!isInEmergency()) return;
    emergencySave(key, getData());
  });
  return emergencyRestore<T>(key);
}
