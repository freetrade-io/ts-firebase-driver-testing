import {
    IFirebaseBuilderDatabase,
    IFirebaseBuilderPubSub,
} from "../FirebaseDriver"

export interface IFirebaseRealtimeDatabase {
    ref(path?: string): IFirebaseRealtimeDatabaseRef
}

export interface IFirebaseDataSnapshot {
    exists(): boolean

    val(): any

    forEach(action: (snapshot: IFirebaseDataSnapshot) => boolean | void): void

    child(path: string): IFirebaseDataSnapshot
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
    child(path: string): IFirebaseRealtimeDatabaseRef

    push(path: string): IFirebaseRealtimeDatabaseRef

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
