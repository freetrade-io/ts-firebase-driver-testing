export interface IFirebaseDriver {
    realTimeDatabase(): IFirebaseRealtimeDatabase
    runWith(runtimeOptions: IRunTimeOptions): IFirebaseFunctionBuilder
    runOptions(memory?: MemoryOption, timeoutSeconds?: number): IRunTimeOptions
}

export type MemoryOption = "128MB" | "256MB" | "512MB" | "1GB" | "2GB"
export interface IRunTimeOptions {
    memory?: MemoryOption,
    timeoutSeconds?: number,
}

export interface IFirebaseRealtimeDatabase {
    ref(path?: string): IFirebaseRealtimeDatabaseRef
}

export interface IFirebaseRealtimeDatabaseSnapshot {
    exists(): boolean
    val(): any
}

export interface IFirebaseRealtimeDatabaseRef {
    child(path: string): IFirebaseRealtimeDatabaseRef
    set(value: any): Promise<void>
    update(value: object): Promise<void>
    once(eventType: string): Promise<IFirebaseRealtimeDatabaseSnapshot>
}

export interface IFirebaseFunctionBuilder {
    pubsub: IFirebasePubSub
}

export interface IFirebasePubSub {
    schedule(schedule: string): IFirebaseScheduleBuilder
}

export interface IFirebaseRunnable<T> {
    run: (data: T, context: any) => Promise<any>
}
export type CloudFunction<T> = IFirebaseRunnable<T> &
    ((input: any, context?: any) => PromiseLike<any>)

export interface IFirebaseScheduleBuilder {
    timeZone(timeZone: string): IFirebaseScheduleBuilder
    onRun(handler: (context: object) => PromiseLike<any>): CloudFunction<{}>
}
