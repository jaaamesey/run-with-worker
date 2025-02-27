declare function runWithWorker<T, D extends Readonly<[...any]>>(func: (...deps: {
    [i in keyof D]: Awaited<D[i]> extends infer R extends Record<string, unknown> ? R extends {
        _$trustedScriptUrl: string;
    } ? Awaited<D[i]> : {
        _$trustedScriptUrl: never;
    } & {
        [f in keyof R]: R[f] extends Function ? never : R[f];
    } : Awaited<D[i]>;
} & Array<any>) => T, deps?: Readonly<[...D]>, opts?: {
    workerOptions?: WorkerOptions;
}): Promise<T>;

export { runWithWorker };
