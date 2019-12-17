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
    TriggerFunction,
} from "../ChangeObserver/DatabaseChangeObserver"

export function makeFirestoreChangeObserver(
    changeType: ChangeType,
    observedPath: string,
    handler: TriggerFunction<IFirestoreChangeSnapshot>,
) {
    switch (changeType) {
        case "created":
            return new FirestoreCreatedObserver(observedPath, handler)
        case "updated":
            return new FirestoreUpdatedObserver(observedPath, handler)
        case "deleted":
            return new FirestoreDeletedObserver(observedPath, handler)
        case "written":
            return new FirestoreWrittenObserver(observedPath, handler)
    }
}

export interface IFirestoreChangeSnapshot {
    exists: boolean
    data(): any
}

class FirestoreCreatedObserver extends DatabaseChangeObserver<
    IFirestoreChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new CreatedChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<IFirestoreChangeSnapshot> | IFirestoreChangeSnapshot {
        return {
            exists: !_.isNil(pc.change.after),
            data: () => pc.change.after,
        }
    }
}

class FirestoreUpdatedObserver extends DatabaseChangeObserver<
    IFirestoreChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new UpdatedChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<IFirestoreChangeSnapshot> | IFirestoreChangeSnapshot {
        return {
            before: {
                exists: !_.isNil(pc.change.before),
                data: () => pc.change.before,
            },
            after: {
                exists: !_.isNil(pc.change.after),
                data: () => pc.change.after,
            },
        }
    }
}

class FirestoreDeletedObserver extends DatabaseChangeObserver<
    IFirestoreChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new DeletedChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<IFirestoreChangeSnapshot> | IFirestoreChangeSnapshot {
        return {
            exists: !_.isNil(pc.change.after),
            data: () => pc.change.after,
        }
    }
}

class FirestoreWrittenObserver extends DatabaseChangeObserver<
    IFirestoreChangeSnapshot
> {
    protected changeFilter(): IChangeFilter {
        return new WrittenChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<IFirestoreChangeSnapshot> | IFirestoreChangeSnapshot {
        return {
            before: {
                exists: !_.isNil(pc.change.before),
                data: () => pc.change.before,
            },
            after: {
                exists: !_.isNil(pc.change.after),
                data: () => pc.change.after,
            },
        }
    }
}
