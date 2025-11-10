export function deferSyncTask<T>(task: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          try {
            const result = task();
            setTimeout(() => resolve(result), 1000);
          } catch (error) {
            reject(error);
          }
        },
        { timeout: 0 }
      );
    } else {
      setTimeout(() => {
        try {
          const result = task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0);
    }
  });
}
