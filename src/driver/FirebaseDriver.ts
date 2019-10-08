export interface IFirebaseDriver {
    realTimeDatabase(): IFirebaseRealtimeDatabase
    pubSubCl(): IFirebasePubSubCl
    runWith(runtimeOptions?: {
        memory: MemoryOption
        timeoutSeconds: number
    }): IFirebaseFunctionBuilder
}

export type MemoryOption = "128MB" | "256MB" | "512MB" | "1GB" | "2GB"

export interface IFirebaseRealtimeDatabase {
    ref(path?: string): IFirebaseRealtimeDatabaseRef
}

export interface IFirebasePubSubCl {
    topic(name: string): IPubSubTopic
}

export interface IPubSubTopic {
    publisher(): IPubSubPublisher
}

export interface IPubSubPublisher {
    publish(data: Buffer): Promise<void>
}

export interface IFirebaseDataSnapshot {
    exists(): boolean
    val(): any
    forEach(action: (snapshot: IFirebaseDataSnapshot) => boolean | void): void
    child(path: string): IFirebaseDataSnapshot
}

export interface IFirebaseRealtimeDatabaseQuery {
    orderByChild(path: string): IFirebaseRealtimeDatabaseQuery
    orderByValue(): IFirebaseRealtimeDatabaseQuery
    startAt(
        value: number | string | boolean | null,
    ): IFirebaseRealtimeDatabaseQuery
    endAt(
        value: number | string | boolean | null,
    ): IFirebaseRealtimeDatabaseQuery
    equalTo(
        value: number | string | boolean | null,
    ): IFirebaseRealtimeDatabaseQuery
    once(eventType: string): Promise<IFirebaseDataSnapshot>
}

export interface IFirebaseRealtimeDatabaseRef
    extends IFirebaseRealtimeDatabaseQuery {
    child(path: string): IFirebaseRealtimeDatabaseRef
    set(value: any): Promise<void>
    update(value: object): Promise<void>
    remove(): Promise<void>
    transaction(
        transactionUpdate: (currentValue: any) => any,
    ): Promise<{
        committed: boolean
        snapshot: IFirebaseDataSnapshot | null
    }>
}

export interface IFirebaseFunctionBuilder {
    pubsub: IFirebaseBuilderPubSub
    database: IFirebaseBuilderDatabase
}

export interface IFirebaseBuilderPubSub {
    schedule(schedule: string): IFirebaseScheduleBuilder
    topic(topic: string): IFirebaseTopicBuilder
}

export interface IFirebaseBuilderDatabase {
    ref(path: string): IFirebaseRefBuilder
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

export interface IFirebaseTopicBuilder {
    onPublish(
        handler: (message: object, context: object) => any,
    ): CloudFunction<any>
}

export interface IFirebaseRefBuilder {
    onCreate(
        handler: (
            snapshot: IFirebaseDataSnapshot,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any>

    onUpdate(
        handler: (
            change: IFirebaseChange<IFirebaseDataSnapshot>,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any>

    onDelete(
        handler: (
            snapshot: IFirebaseDataSnapshot,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any>

    onWrite(
        handler: (
            change: IFirebaseChange<IFirebaseDataSnapshot>,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any>
}

export interface IFirebaseChange<T> {
    before: T
    after: T
}

export interface IFirebaseEventContext {
    eventId: string
    timestamp: string
    eventType: string
    params: { [option: string]: any }
}
