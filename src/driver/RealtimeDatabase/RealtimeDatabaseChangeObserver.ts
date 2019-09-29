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
    onChange(changedPath: string, change: IChange): Promise<void>
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

interface IChangeSnapshot {
    val(): any
    exists(): boolean
}

type TriggerFunction = (
    change: { before: IChangeSnapshot; after: IChangeSnapshot },
    context: { params: IChangeParams },
) => PromiseLike<any>

abstract class RealtimeDatabaseChangeObserver
    implements IRealtimeDatabaseChangeObserver {
    constructor(
        protected readonly observedPath: string,
        protected readonly handler: TriggerFunction,
    ) {}

    async onChange(path: string, change: IChange): Promise<void> {
        const relevantChanges = this.changeFilter().changeEvents(change)
        await Promise.all(
            relevantChanges.map((pc: IParameterisedChange) => {
                return this.handler(
                    {
                        before: {
                            val: () => pc.change.before,
                            exists: () => !_.isNil(pc.change.before),
                        },
                        after: {
                            val: () => pc.change.after,
                            exists: () => !_.isNil(pc.change.after),
                        },
                    },
                    {
                        params: pc.parameters,
                    },
                )
            }),
        )
    }

    protected abstract changeFilter(): IChangeFilter
}

class RealtimeDatabaseCreatedObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new CreatedChangeFilter(this.observedPath)
    }
}

class RealtimeDatabaseUpdatedObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new UpdatedChangeFilter(this.observedPath)
    }
}

class RealtimeDatabaseDeletedObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new DeletedChangeFilter(this.observedPath)
    }
}

class RealtimeDatabaseWrittenObserver extends RealtimeDatabaseChangeObserver {
    protected changeFilter(): IChangeFilter {
        return new WrittenChangeFilter(this.observedPath)
    }
}
