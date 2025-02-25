/**
 * Runs the provided function in an ephemeral, single-purpose worker.
 * If your function needs to make asynchronous calls, try `runInWorkerCallback` instead.
 */
declare function runWithWorker<T, D extends Readonly<[...any]>>(
/**
 * Function to run with the worker.
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
deps?: Readonly<[...D]>, opts?: {
    workerOptions?: WorkerOptions;
    importUrl?: string;
}): Promise<T>;
/**
 * Same as `runWithWorker`, but for functions that make asynchronous calls.
 * Requires `func` to call `resolve` or `reject` instead of directly returning a result.
 */
declare function runWithWorkerCallback<T, D extends Readonly<[...any]>>(func: (resolve: (r: T) => void, reject: (e: unknown) => void, deps: D) => void, deps?: Readonly<[...D]>, opts?: {
    workerOptions?: WorkerOptions;
    importUrl?: string;
}): Promise<T>;

export { runWithWorker, runWithWorkerCallback };
