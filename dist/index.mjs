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
function runWithWorker(func, deps, opts) {
  return __async(this, null, function* () {
    return new Promise((resolve, reject) => {
      const url = new URL(
        URL.createObjectURL(
          new Blob(["onmessage = (m) => postMessage(new Function(m.data)())"])
        ),
        opts == null ? void 0 : opts.importUrl
      );
      const worker = new Worker(url, opts == null ? void 0 : opts.workerOptions);
      const funcStr = `return (${func.toString()})(${deps ? `...${JSON.stringify(deps)}` : ""})`;
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
  });
}
function runWithWorkerCallback(func, deps, opts) {
  return __async(this, null, function* () {
    const url = new URL(
      URL.createObjectURL(
        new Blob(["onmessage = (m) => ((new Function(m.data))())"])
      ),
      opts == null ? void 0 : opts.importUrl
    );
    return new Promise((resolve, reject) => {
      const worker = new Worker(url, opts == null ? void 0 : opts.workerOptions);
      const funcStr = `(${func.toString()})(r => postMessage(r), e => {throw e}, ${JSON.stringify(deps != null ? deps : [])})`;
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
  });
}
export {
  runWithWorker,
  runWithWorkerCallback
};
//# sourceMappingURL=index.mjs.map