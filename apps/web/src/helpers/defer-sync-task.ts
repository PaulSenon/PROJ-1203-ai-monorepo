export function deferSyncTask<T>(
  task: () => T | Promise<T>,
  options: { delay?: number } = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const executeTask = async () => {
      try {
        await new Promise((r) => setTimeout(r, options.delay ?? 0));
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          executeTask();
        },
        { timeout: undefined } // never force calling
      );
    } else {
      // Polyfill: use requestAnimationFrame + setTimeout to approximate idle period
      // If timeout is provided, use it as maximum delay; otherwise use 0 for next frame
      requestAnimationFrame(() => {
        executeTask();
      });
    }
  });
}
