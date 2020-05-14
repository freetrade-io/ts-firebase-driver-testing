import { JsonValue } from "../../util/json"
import {
    IChange,
    IChangeFilter,
    IChangeParams,
    IParameterisedChange,
} from "./DatabaseChangeFilter"

export interface IDatabaseChangeObserver {
    onChange(change: IChange, dotPath?: string[]): Promise<void>
}

export type ChangeType = "created" | "updated" | "deleted" | "written"

export interface IChangeSnapshots<T> {
    before: T
    after: T
    data: JsonValue | undefined
    delta: JsonValue | undefined
}

export interface IChangeContext {
    params: IChangeParams
    timestamp: string
}

export type TriggerFunction<T> = (
    change: IChangeSnapshots<T> | T,
    context: IChangeContext,
) => PromiseLike<any>

export abstract class DatabaseChangeObserver<T>
    implements IDatabaseChangeObserver {
    constructor(
        protected readonly observedPath: string,
        protected readonly handler: TriggerFunction<T>,
    ) {}

    async onChange(change: IChange, dotPath?: string[]): Promise<void> {
        const relevantChanges = this.changeFilter().changeEvents(
            change,
            dotPath,
        )
        await Promise.all(
            relevantChanges.map((pc: IParameterisedChange) => {
                return this.handler(this.makeChangeObject(pc), {
                    params: pc.parameters,
                    timestamp: new Date().toISOString(),
                })
            }),
        )
    }

    protected abstract changeFilter(): IChangeFilter

    protected abstract makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<T> | T
}
