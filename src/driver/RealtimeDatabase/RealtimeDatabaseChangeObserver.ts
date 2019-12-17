import _ from "lodash"
import {
    CreatedChangeFilter,
    DeletedChangeFilter,
    IChangeFilter,
    IParameterisedChange,
    UpdatedChangeFilter,
    WrittenChangeFilter,
} from "../ChangeObserver/DatabaseChangeFilter"
import {
    ChangeType,
    DatabaseChangeObserver,
    IChangeSnapshots,
    IDatabaseChangeObserver,
    TriggerFunction,
} from "../ChangeObserver/DatabaseChangeObserver"

export function makeRealtimeDatabaseChangeObserver(
    changeType: ChangeType,
    observedPath: string,
    handler: TriggerFunction<IRealtimeDatabaseChangeSnapshot>,
): IDatabaseChangeObserver {
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

export interface IRealtimeDatabaseChangeSnapshot {
    val(): any
    exists(): boolean
}

class RealtimeDatabaseCreatedObserver extends DatabaseChangeObserver<
    IRealtimeDatabaseChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new CreatedChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ):
        | IChangeSnapshots<IRealtimeDatabaseChangeSnapshot>
        | IRealtimeDatabaseChangeSnapshot {
        return {
            val: () => pc.change.after,
            exists: () => !_.isNil(pc.change.after),
        }
    }
}

class RealtimeDatabaseUpdatedObserver extends DatabaseChangeObserver<
    IRealtimeDatabaseChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new UpdatedChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ):
        | IChangeSnapshots<IRealtimeDatabaseChangeSnapshot>
        | IRealtimeDatabaseChangeSnapshot {
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

class RealtimeDatabaseDeletedObserver extends DatabaseChangeObserver<
    IRealtimeDatabaseChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new DeletedChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ):
        | IChangeSnapshots<IRealtimeDatabaseChangeSnapshot>
        | IRealtimeDatabaseChangeSnapshot {
        return {
            val: () => pc.change.after,
            exists: () => !_.isNil(pc.change.after),
        }
    }
}

class RealtimeDatabaseWrittenObserver extends DatabaseChangeObserver<
    IRealtimeDatabaseChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new WrittenChangeFilter(this.observedPath)
    }
    protected makeChangeObject(
        pc: IParameterisedChange,
    ):
        | IChangeSnapshots<IRealtimeDatabaseChangeSnapshot>
        | IRealtimeDatabaseChangeSnapshot {
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
