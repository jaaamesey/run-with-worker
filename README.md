# run-in-worker

## Note: This library is still in a very experimental stage of development. Please excuse the lack of documentation and feel free to report any issues on GitHub.

Wanna just... run a function inside a Web Worker?

## Background
Web Workers are great in theory. They finally bring something resembling threads to JS, and allow for arbitary JS to run in a somewhat safe sandbox.

They're also tricky to use properly, especially when bundlers are involved. There's no easy way to just *run a single task* in one, and it's hard to work with them in a type safe way.

## What this library does
This library currently exposes two functions:

`runInWorker`: Allows a synchronous function to run inside a worker, returning a `Promise`.
`runInWorkerCallback`: Same as above, but for asynchronous functions. Requires `resolve` or `reject` to be called explicitly, but still returns a `Promise`.

These functions create an ephemeral `Worker` that exists solely for the lifetime of the task being completed, and sneakily execute the provided function in that `Worker` instead of the main thread.

Here's an example:
```ts
import { runInWorker } from 'run-in-worker';

const result = await runInWorker(() => 1 + 1);
console.log(result); // 2
```

And for something asynchronous:
```ts
const result = await runInWorkerCallback((resolve, reject) => {
    setTimeout(() => resolve('result'), 1000);
});
console.log(result); // 'result'
```

(`runInWorker` doesn't currently accept `Promise`s as a return value due to some weirdness with TS and Babel - apologies)

Since `Worker`s have a few ms of spin up time, you'd probably only want to use this for functions that are more computationally intensive.

This library should work in both bundled and non-bundled JS environments. It should also be *reasonably* TypeScript friendly. 


### Limitations
- **Functions cannot capture values or other functions from their surrounding scope.** You'll need to pass down a dependency array to get around this - see "Dealing with external values".
- Whilst you can import the function you want to run from another file, that file itself **can't use its own imported functions and values**.
- Functions are subject to all normal limitations of code that runs inside Web Workers (e.g. **no DOM operations**).
- Return values must be compatible with `structuredClone`, and values in the dependency array must be serializable to JSON.

### Dealing with external values
As mentioned, functions can't capture their surrounding scope:

```ts
const a = 1;
const b = 2;
const result = runInWorker(() => {
    // ❌ Illegal. The Web Worker doesn't know what `a` and `b` are.
    return a + b;
});
```

**Unfortunately this currently only results in errors at runtime**. Linters won't pick up on the fact that this function actually runs in an isolated Worker.

To get around this, you can pull parameters from a dependency array:

```ts
const a = 1;
const b = 2;
const result = runInWorker((a, b) => {
    // ✅ Should work fine. `a` and `b` are passed down as parameters.
    return a + b;
}, [a, b]);
```

## Things that might be added in the future
- For faster spin up times, we should probably expose ways to re-use the same Worker, or use some kind of Worker pool internally.
- Make `runInWorker` accept an `async` function, as a better alternative to `runInWorkerCallback`. Some build setups have trouble with `async` functions in Web Workers, so that'll need to be explored further first.
- Proper support for module imports.
- Lint rules to enforce that inline functions don't capture their surrounding scope.


