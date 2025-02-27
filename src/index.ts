const WORKER_URL = URL.createObjectURL(
  new Blob([
    "onmessage = (m) => (async function(){}).constructor(m.data.funcStr)(m.data.args)",
  ]),
);

type ExtraReturnFields = { cancel: () => void; worker: Worker };

export function runWithWorker<T, D extends Readonly<[...any]>>(
  task: (
    ...deps: {
      [i in keyof D]: Awaited<D[i]> extends infer R extends Record<
        string,
        unknown
      >
        ? R extends { _$trustedScriptUrl: string }
          ? Awaited<D[i]>
          : { _$trustedScriptUrl: never } & {
              [f in keyof R]: R[f] extends Function ? never : R[f];
            }
        : Awaited<D[i]>;
    } & Array<any>
  ) => T,
  deps?: Readonly<[...D]>,
  opts?: { workerOptions?: WorkerOptions; executionTimeoutMs?: number },
): Promise<T> & ExtraReturnFields {
  const worker = new Worker(WORKER_URL, opts?.workerOptions);

  let capturedReject: undefined | ((e: unknown) => void);
  const promise: Promise<T> & Partial<ExtraReturnFields> = new Promise(
    async (resolve, reject) => {
      try {
        capturedReject = reject;
        const awaitedDeps = await Promise.all(deps ?? []);
        const args = awaitedDeps.map((d) => {
          if (typeof d?._$trustedScriptUrl === "string") {
            return {
              $__trustedScript: `import(${JSON.stringify(d._$trustedScriptUrl)})`,
            };
          }
          return d;
        });
        const funcStr = `Promise.all(arguments[0].map(d => d && typeof d.$__trustedScript === 'string' ? eval(d.$__trustedScript) : d)).then(deps => (${task.toString()})(...deps)).then(r=>postMessage(r)).catch(e=>postMessage({$__error:e}))`;
        worker.onmessage = (m) => {
          m.data?.$__error ? reject(m.data?.$__error) : resolve(m.data);
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
        if (opts?.executionTimeoutMs != null) {
          setTimeout(
            () =>
              reject(
                new TaskTimeoutError(
                  `Task exceeded ${opts.executionTimeoutMs}ms`,
                ),
              ),
            opts.executionTimeoutMs,
          );
        }
        worker.postMessage({ funcStr, args });
      } catch (e) {
        reject(e);
      }
    },
  );

  promise.cancel = () => {
    worker.terminate();
    capturedReject?.(new TaskCancellationError("Task cancelled"));
  };
  promise.worker = worker;

  return promise as Promise<T> & ExtraReturnFields;
}

export class TaskCancellationError extends Error {}
export class TaskTimeoutError extends Error {}
