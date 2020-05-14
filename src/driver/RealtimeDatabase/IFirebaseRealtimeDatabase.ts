export interface IFirebaseRealtimeDatabase {
    ref(path?: string): IFirebaseRealtimeDatabaseRef
}

export interface IFirebaseDataSnapshot {
    readonly key: string | null
    readonly ref: IFirebaseRealtimeDatabaseRef

    exists(): boolean

    val(): any

    forEach(action: (snapshot: IFirebaseDataSnapshot) => boolean | void): void

    child(path: string): IFirebaseDataSnapshot

    numChildren(): number
}

export interface IFirebaseRealtimeDatabaseQuery {
    orderByKey(): IFirebaseRealtimeDatabaseQuery

    orderByChild(path: string): IFirebaseRealtimeDatabaseQuery

    orderByValue(): IFirebaseRealtimeDatabaseQuery

    limitToFirst(limit: number): IFirebaseRealtimeDatabaseQuery

    limitToLast(limit: number): IFirebaseRealtimeDatabaseQuery

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
    readonly path: string

    child(path: string): IFirebaseRealtimeDatabaseRef

    push(value?: any): IFirebaseRealtimeDatabaseRef

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

export interface IFirebaseChange<T> {
    before: T | undefined
    after: T | undefined
    data: T | undefined
    delta: T | undefined
}

export interface IFirebaseEventContext {
    eventId: string
    timestamp: string
    eventType: string
    params: { [option: string]: any }
}

export interface IPubSubMessage {
    readonly data: string
    readonly attributes: { [key: string]: string }
    readonly json: any
    toJSON(): any
}
