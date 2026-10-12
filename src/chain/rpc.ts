export async function rpcRead<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    timeoutMs?: number;
    onRetry?: () => void;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  for (let attempt = 0; ; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("RPC read timed out")),
            options.timeoutMs ?? 3000,
          );
        }),
      ]);
    } catch (error) {
      if (attempt + 1 >= attempts || options.shouldRetry?.(error) === false)
        throw error;
      options.onRetry?.();
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}
