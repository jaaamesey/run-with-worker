var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var WORKER_URL = URL.createObjectURL(
  new Blob([
    "onmessage = (m) => (async function(){}).constructor(m.data.funcStr)(m.data.args)"
  ])
);
function runWithWorker(task, deps, opts) {
  const worker = new Worker(WORKER_URL, opts == null ? void 0 : opts.workerOptions);
  let capturedReject;
  const promise = new Promise(
    (resolve, reject) => __async(this, null, function* () {
      try {
        capturedReject = reject;
        const awaitedDeps = yield Promise.all(deps != null ? deps : []);
        const args = awaitedDeps.map((d) => {
          if (typeof (d == null ? void 0 : d._$trustedScriptUrl) === "string") {
            return {
              $__trustedScript: `import(${JSON.stringify(d._$trustedScriptUrl)})`
            };
          }
          return d;
        });
        const funcStr = `Promise.all(arguments[0].map(d => d && typeof d.$__trustedScript === 'string' ? eval(d.$__trustedScript) : d)).then(deps => (${task.toString()})(...deps)).then(r=>postMessage(r)).catch(e=>postMessage({$__error:e}))`;
        worker.onmessage = (m) => {
          var _a, _b;
          ((_a = m.data) == null ? void 0 : _a.$__error) ? reject((_b = m.data) == null ? void 0 : _b.$__error) : resolve(m.data);
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
        if ((opts == null ? void 0 : opts.executionTimeoutMs) != null) {
          setTimeout(
            () => reject(
              new TaskTimeoutError(
                `Task exceeded ${opts.executionTimeoutMs}ms`
              )
            ),
            opts.executionTimeoutMs
          );
        }
        worker.postMessage({ funcStr, args });
      } catch (e) {
        reject(e);
      }
    })
  );
  promise.cancel = () => {
    worker.terminate();
    capturedReject == null ? void 0 : capturedReject(new TaskCancellationError("Task cancelled"));
  };
  promise.worker = worker;
  return promise;
}
var TaskCancellationError = class extends Error {
};
var TaskTimeoutError = class extends Error {
};
export {
  TaskCancellationError,
  TaskTimeoutError,
  runWithWorker
};
//# sourceMappingURL=index.mjs.map