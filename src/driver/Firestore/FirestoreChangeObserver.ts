import _ from "lodash"
import {
    InProcessFirestore,
    InProcessFirestoreDocRef,
} from "./InProcessFirestore"
import { JsonValue } from "../../util/json"
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
import {
    IFirestore,
    IFirestoreDocRef,
    IFirestoreDocumentData,
    IFirestoreDocumentSnapshot,
} from "./IFirestore"
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
            return new FirestoreWrittenObserver(
                observedPath,
                handler,
                firestore,
            )
    }
}

export interface IFirestoreChangeSnapshot {
    exists: boolean
    data(): any
}

function isObject(potentialObject: any): potentialObject is object {
    return _.isObject(potentialObject)
}

function prepareChangeData(
    data: JsonValue | undefined,
): IFirestoreDocumentData | undefined {
    if (isObject(data)) {
        return _.cloneDeep(stripMeta(data))
    }
    return undefined
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
            data: pc.change.data,
            delta: pc.change.delta,
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
    constructor(
        protected readonly observedPath: string,
        protected readonly handler: TriggerFunction<IFirestoreChangeSnapshot>,
        private readonly firestore: IFirestore,
    ) {
        super(observedPath, handler)
    }

    protected changeFilter(): IChangeFilter {
        return new WrittenChangeFilter(this.observedPath)
    }

    protected makeChangeObject(
        pc: IParameterisedChange,
    ): IChangeSnapshots<IFirestoreDocumentSnapshot> | IFirestoreChangeSnapshot {
        const pathComponents = pc.path.split("/")
        const id = pathComponents[pathComponents.length - 1]
        const ref = new InProcessFirestoreDocRef(
            pc.path,
            this.firestore as InProcessFirestore,
        ) as IFirestoreDocRef

        const before = new InProcessFirestoreDocumentSnapshot(
            id,
            !_.isNil(pc.change.before),
            ref,
            prepareChangeData(pc.change.before),
        )

        const after = new InProcessFirestoreDocumentSnapshot(
            id,
            !_.isNil(pc.change.after),
            ref,
            prepareChangeData(pc.change.after),
        )

        return {
            before,
            after,
            data: pc.change.data,
            delta: pc.change.delta,
        }
    }
}
