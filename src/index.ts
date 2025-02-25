/**
 * Runs the provided function in an ephemeral, single-purpose worker.
 * If your function needs to make asynchronous calls, try `runInWorkerCallback` instead.
 */
export async function runInWorker<T, D extends Readonly<[...any]>>(
  /**
   * Function to run in the worker.
   * Should adhere to the following rules:
   * - must return a serializable value (e.g. no `Promise`s or functions)
   * - must not read values from outside scope - use `deps` to pass these down instead
   * - must otherwise be legal code to run inside a Worker (e.g. no DOM operations)
   */
  func: (...deps: D) => T,
  /**
   * Dependencies from outside to pass down into the function.
   * Must be serializable.
   */
  deps?: Readonly<[...D]>,
  opts?: { workerOptions?: WorkerOptions; importUrl?: string },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(
      URL.createObjectURL(
        new Blob(["onmessage = (m) => postMessage(new Function(m.data)())"]),
      ),
      opts?.importUrl,
    );
    const worker = new Worker(url, opts?.workerOptions);
    const funcStr = `return (${func.toString()})(${
      deps ? `...${JSON.stringify(deps)}` : ""
    })`;
    worker.onmessage = (m) => {
      resolve(m.data);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.onmessageerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.postMessage(funcStr);
  });
}

/**
 * Same as `runInWorker`, but for functions that make asynchronous calls.
 * Requires `func` to call `resolve` or `reject` instead of directly returning a result.
 */
export async function runInWorkerCallback<T, D extends Readonly<[...any]>>(
  func: (
    resolve: (r: T) => void,
    reject: (e: unknown) => void,
    deps: D,
  ) => void,
  deps?: Readonly<[...D]>,
  opts?: { workerOptions?: WorkerOptions; importUrl?: string },
): Promise<T> {
  const url = new URL(
    URL.createObjectURL(
      new Blob(["onmessage = (m) => ((new Function(m.data))())"]),
    ),
    opts?.importUrl,
  );
  return new Promise((resolve, reject) => {
    const worker = new Worker(url, opts?.workerOptions);
    const funcStr = `(${func.toString()})(r => postMessage(r), e => {throw e}, ${JSON.stringify(deps ?? [])})`;
    worker.onmessage = (m) => {
      resolve(m.data);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.onmessageerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.postMessage(funcStr);
  });
}
