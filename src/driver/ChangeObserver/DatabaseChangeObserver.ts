import { performance } from "perf_hooks"
import { JsonValue } from "../../util/json"
import {
    IChange,
    IChangeFilter,
    IChangeParams,
    IParameterisedChange,
} from "./DatabaseChangeFilter"

export interface IDatabaseChangePerformanceStats {
    path?: string
    topicName?: string
    durationMillis: number
}

export interface IDatabaseChangeObserver {
    onChange(
        change: IChange,
        dotPath?: string[],
    ): Promise<IDatabaseChangePerformanceStats>
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
    ) {
    }

    async onChange(
        change: IChange,
        dotPath?: string[],
    ): Promise<IDatabaseChangePerformanceStats> {
        const start = performance.now()
        const relevantChanges = this.changeFilter().changeEvents(
            change,
            dotPath,
        )
        await Promise.all(
            relevantChanges.map((pc: IParameterisedChange) => {
                return new Promise((resolve, reject) => {
                    this.handler(this.makeChangeObject(pc), {
                        params: pc.parameters,
                        timestamp: new Date().toISOString(),
                    }).then(resolve, reject)
                })
            }),
        )

        const path = (dotPath || []).join("/")
        const duration = performance.now() - start
        return {
            path,
            durationMillis: duration,
        }
    }

    protected abstract changeFilter(): IChangeFilter

    protected abstract makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<T> | T
}
