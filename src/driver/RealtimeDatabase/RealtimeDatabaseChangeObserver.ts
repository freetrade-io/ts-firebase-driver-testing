import _ from "lodash"
import {
    CreatedChangeFilter,
    DeletedChangeFilter,
    IChange,
    IChangeFilter,
    IChangeParams,
    IParameterisedChange,
    UpdatedChangeFilter,
    WrittenChangeFilter,
} from "./RealtimeDatabaseChangeFilter"

export interface IRealtimeDatabaseChangeObserver {
    onChange(change: IChange): Promise<void>
}

export function makeChangeObserver(
    changeType: ChangeType,
    observedPath: string,
    handler: TriggerFunction,
): IRealtimeDatabaseChangeObserver {
    switch (changeType) {
        case "created":
            return new RealtimeDatabaseCreatedObserver(observedPath, handler)
        case "updated":
            return new RealtimeDatabaseUpdatedObserver(observedPath, handler)
        case "deleted":
            return new RealtimeDatabaseDeletedObserver(observedPath, handler)
        case "written":
            return new RealtimeDatabaseWrittenObserver(observedPath, handler)
    }
}

export type ChangeType = "created" | "updated" | "deleted" | "written"

export interface IChangeSnapshots {
    before: IChangeSnapshot
    after: IChangeSnapshot
}
export interface IChangeSnapshot {
    val(): any
    exists(): boolean
}

export interface IChangeContext {
    params: IChangeParams
}

type TriggerFunction = (
    change: IChangeSnapshots | IChangeSnapshot,
    context: IChangeContext,
) => PromiseLike<any>

abstract class RealtimeDatabaseChangeObserver
    implements IRealtimeDatabaseChangeObserver {
    constructor(
        protected readonly observedPath: string,
        protected readonly handler: TriggerFunction,
    ) {}

    async onChange(change: IChange): Promise<void> {
        const relevantChanges = this.changeFilter().changeEvents(change)
        await Promise.all(
            relevantChanges.map((pc: IParameterisedChange) => {
                return this.handler(this.makeChangeObject(pc), {
                    params: pc.parameters,
                })
            }),
        )
    }

    protected abstract changeFilter(): IChangeFilter
    protected abstract makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots | IChangeSnapshot
}

class RealtimeDatabaseCreatedObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new CreatedChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots | IChangeSnapshot {
        return {
            val: () => pc.change.after,
            exists: () => !_.isNil(pc.change.after),
        }
    }
}

class RealtimeDatabaseUpdatedObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new UpdatedChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots | IChangeSnapshot {
        return {
            before: {
                val: () => pc.change.before,
                exists: () => !_.isNil(pc.change.before),
            },
            after: {
                val: () => pc.change.after,
                exists: () => !_.isNil(pc.change.after),
            },
        }
    }
}

class RealtimeDatabaseDeletedObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new DeletedChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots | IChangeSnapshot {
        return {
            val: () => pc.change.after,
            exists: () => !_.isNil(pc.change.after),
        }
    }
}

class RealtimeDatabaseWrittenObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new WrittenChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots | IChangeSnapshot {
        return {
            before: {
                val: () => pc.change.before,
                exists: () => !_.isNil(pc.change.before),
            },
            after: {
                val: () => pc.change.after,
                exists: () => !_.isNil(pc.change.after),
            },
        }
    }
}
