const WORKER_URL = URL.createObjectURL(
  new Blob([
    "onmessage = (m) => (async function(){}).constructor(m.data.funcStr)(m.data.args)",
  ]),
);

export async function runWithWorker<T, D extends Readonly<[...any]>>(
  func: (
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
  opts?: { workerOptions?: WorkerOptions },
): Promise<T> {
  const worker = new Worker(WORKER_URL, opts?.workerOptions);
  return new Promise(async (resolve, reject) => {
    try {
      const awaitedDeps = await Promise.all(deps ?? []);
      const args = awaitedDeps.map((d) => {
        if (typeof d?._$trustedScriptUrl === "string") {
          return {
            $__trustedScript: `import(${JSON.stringify(d._$trustedScriptUrl)})`,
          };
        }
        return d;
      });
      const funcStr = `Promise.all(arguments[0].map(d => d && typeof d.$__trustedScript === 'string' ? eval(d.$__trustedScript) : d)).then(deps => (${func.toString()})(...deps)).then(r=>postMessage(r)).catch(e=>postMessage({$__error:e}))`;
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
      worker.postMessage({ funcStr, args });
    } catch (e) {
      reject(e);
    }
  });
}
