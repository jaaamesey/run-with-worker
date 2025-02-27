# run-with-worker

*Note: This library is still in a very experimental stage of development. Please excuse the lack of documentation and feel free to report any issues on [GitHub](https://github.com/jaaamesey/run-with-worker).*

Wanna just... run a function inside a Web Worker?

...in a type safe way?

...with support for dynamic `import`s, returning `Promise`s, and timeouts?

## Installation

`npm i run-with-worker`

## Background

Web Workers are great in theory. They finally bring something resembling threads to JS, and allow for arbitary JS to run in a somewhat isolated sandbox.

They're also tricky to use properly, especially when bundlers are involved. There's no easy way to just *run a single task* in one, and it's hard to work with them in a type safe way.

## What this library does

This library currently exposes a `runWithWorker` function. This function allows a provided function to run inside a worker, and returns a `Promise` wrapping the result of that function.

This works by creating an ephemeral `Worker` that exists solely for the lifetime of the task being completed, and sneakily executing the provided function in that `Worker` instead of the main thread.

Here's an example:
```ts
import { runWithWorker } from 'run-with-worker';

const result = await runWithWorker(() => 1 + 1); // TypeScript knows this is a `number`
console.log(result); // 2
```

And for something asynchronous:
```ts
const result = await runWithWorker(() => new Promise((resolve, reject) => {
    setTimeout(() => resolve('result'), 1000);
}));
console.log(result); // 'result'
```

```ts
const result = await runWithWorker(() => fetch('...').then(res => res.json()));
console.log(result); // { ...some data }
```

Running multiple `Worker`s simultaneously:

```ts
Promise.all(
  [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
  ].map(([a, b]) => runWithWorker((a, b) => a * b, [a, b])),
).then((r) => alert(r.reduce((acc, c) => acc + c, 0))); // 40
```

Since `Worker`s introduce a few ms of overhead, you'd probably only want to use this for functions that are more computationally intensive.

## Limitations

- **Functions cannot capture values or other functions from their surrounding scope.** You'll need to pass down a dependency array to get around this, or call functions from a dynamically imported module. See "Dealing with external values" and "Importing modules".
- Some build setups may have trouble with using `async/await` syntax inside the worker function. `.then()` syntax should work fine almost everywhere though.
- A lot of build setups may have trouble with calling dynamic `import`s inside the worker function. See "Importing modules" for a workaround.
- Functions are subject to all normal limitations of code that runs inside Web Workers (e.g. **no DOM operations**).
- Return values and anything in the dependency array (aside from modules) must be compatible with `structuredClone`.

## Dealing with external values
As mentioned, functions can't capture their surrounding scope:

```ts
const a = 1;
const b = 2;
const result = runWithWorker(() => {
    // ❌ Illegal. The Web Worker doesn't know what `a` and `b` are.
    return a + b;
});
```

**Unfortunately this currently only results in errors at runtime**. Linters won't pick up on the fact that this function actually runs in an isolated Worker.

To get around this, you can pull parameters from a dependency array:

```ts
const a = 1;
const b = 2;
const result = runWithWorker((a, b) => {
    // ✅ Should work fine. `a` and `b` are passed down as parameters.
    return a + b;
}, [a, b]);
```

## Importing modules

The only other way you can access functions from outside the task's scope is through dynamically imported modules.

A lot of build setups these days will have problems when trying to run this kind of code in a Web Worker though:

```ts
const result = runWithWorker(() => 
    //  ❌ May throw TypeError: Failed to resolve module specifier
    import('./module').then(module => module.runTask());
);
```

This library supports an alternative solution to this. If you instead use the dependency array to pass down a dynamic module import...

```ts
const result = runWithWorker(
    module => module.runTask(),
    [import('./module')],
); // 'Hello!'
```

...and add the following `export` to the module file being imported:

```ts
/// ./module.ts
export function runTask() {
    return 'Hello!';
}
export const _$trustedScriptUrl = import.meta.url;
```

...that module will be loaded on the main thread, and then *forwarded* to the Worker.

`import.meta.url` is a string that identifies where a module file actually lives at runtime. This must be provided through `_$trustedScriptUrl` for things like function calls to work correctly. If your build setup doesn't support `import.meta.url`, you may need to replace it with some equivalent, or make sure ESM is enabled.

Code you want to run only in the Worker needs to be put inside an exported function, e.g. `runTask()`. **Make sure you trust whatever modules you provide in the dependency array, as any *top-level* code there will run on *both* the main thread and the Worker.** For code from known URLs or strings, you should be able to make use of `import()` or `eval()` inside the worker function instead.

## Timeouts and cancelling tasks

A useful thing about Web Workers is that you can terminate them even if they've hanged.

Here's how to terminate a task after a certain length of time:

```ts
// Worker will be terminated if it takes more than one second to execute,
// and returned `Promise` will be rejected.
runWithWorker(
    () => {
      while (true) {}
    },
    [],
    { executionTimeoutMs: 1000 },
); 
```

You can also manually terminate the Worker like so:

```ts
const task = runWithWorker(
    () => {
      while (true) {}
    },
);
setTimeout(() => task.cancel(), 1000);
// If you're transforming the returned `Promise` with a `.then()` or something,
// make sure the `cancel()` call is still running on the root `Promise`.
const res = await task.then(...);
```
