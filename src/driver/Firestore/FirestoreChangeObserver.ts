import _ from "lodash"
import { stripMeta } from "../../util/stripMeta"
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
import { IFirestore, IFirestoreDocumentSnapshot } from "./IFirestore"
import { InProcessFirestoreDocumentSnapshot } from "./InProcessFirestoreDocumentSnapshot"

export function makeFirestoreChangeObserver(
    changeType: ChangeType,
    observedPath: string,
    handler: TriggerFunction<IFirestoreChangeSnapshot>,
    firestore: IFirestore,
) {
    switch (changeType) {
        case "created":
            return new FirestoreCreatedObserver(
                observedPath,
                handler,
                firestore,
            )
        case "updated":
            return new FirestoreUpdatedObserver(observedPath, handler)
        case "deleted":
            return new FirestoreDeletedObserver(
                observedPath,
                handler,
                firestore,
            )
        case "written":
            return new FirestoreWrittenObserver(observedPath, handler)
    }
}

export interface IFirestoreChangeSnapshot {
    exists: boolean
    data(): any
}

function prepareChangeData(data: object): object {
    return _.cloneDeep(stripMeta(data))
}

class FirestoreCreatedObserver extends DatabaseChangeObserver<
    IFirestoreDocumentSnapshot
> {
    constructor(
        protected readonly observedPath: string,
        protected readonly handler: TriggerFunction<IFirestoreDocumentSnapshot>,
        private readonly firestore: IFirestore,
    ) {
        super(observedPath, handler)
    }

    protected changeFilter(): IChangeFilter {
        return new CreatedChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ):
        | IChangeSnapshots<IFirestoreDocumentSnapshot>
        | IFirestoreDocumentSnapshot {
        return new InProcessFirestoreDocumentSnapshot(
            pc.path.split("/").pop() || "",
            !_.isNil(pc.change.after),
            this.firestore.doc(pc.path),
            prepareChangeData(pc.change.after),
        )
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
                data: () => prepareChangeData(pc.change.before),
            },
            after: {
                exists: !_.isNil(pc.change.after),
                data: () => prepareChangeData(pc.change.after),
            },
        }
    }
}

class FirestoreDeletedObserver extends DatabaseChangeObserver<
    IFirestoreDocumentSnapshot
> {
    constructor(
        protected readonly observedPath: string,
        protected readonly handler: TriggerFunction<IFirestoreDocumentSnapshot>,
        private readonly firestore: IFirestore,
    ) {
        super(observedPath, handler)
    }

    protected changeFilter(): IChangeFilter {
        return new DeletedChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ):
        | IChangeSnapshots<IFirestoreDocumentSnapshot>
        | IFirestoreDocumentSnapshot {
        return new InProcessFirestoreDocumentSnapshot(
            pc.path.split("/").pop() || "",
            !_.isNil(pc.change.after),
            this.firestore.doc(pc.path),
            prepareChangeData(pc.change.after),
        )
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
                data: () => prepareChangeData(pc.change.before),
            },
            after: {
                exists: !_.isNil(pc.change.after),
                data: () => prepareChangeData(pc.change.after),
            },
        }
    }
}
