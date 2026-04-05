import { createControllablePromise } from "@/helpers/controllable-promise-helper";

import {
  appReadySurfaceIds,
  visibilityCoordinator,
} from "./app-ready-visibility";

const appReadyBarrier = createControllablePromise<void>();

function syncAppReadyBarrier() {
  const hasHiddenSurface = appReadySurfaceIds.some(
    (surfaceId) => visibilityCoordinator.getSurfaceState(surfaceId).hidden
  );

  if (hasHiddenSurface) {
    appReadyBarrier.suspend();
    return;
  }

  appReadyBarrier.resolve(undefined);
}

for (const surfaceId of appReadySurfaceIds) {
  visibilityCoordinator.subscribeSurfaceState(surfaceId, syncAppReadyBarrier);
}

syncAppReadyBarrier();

export function appReadyPromise() {
  return appReadyBarrier.wait();
}

export function isAppReady() {
  return appReadyBarrier.ready();
}
