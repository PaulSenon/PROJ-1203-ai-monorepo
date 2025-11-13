export function deferSyncTask<T>(
  task: () => T,
  options: { timeout?: number } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          try {
            const result = task();
            setTimeout(() => resolve(result), options.timeout ?? 0);
          } catch (error) {
            reject(error);
          }
        },
        { timeout: options.timeout ?? 0 }
      );
    } else {
      setTimeout(() => {
        try {
          const result = task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, options.timeout ?? 0);
    }
  });
}
