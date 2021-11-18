import {
    InProcessFirestore,
    InProcessFirestoreDocumentSnapshot,
} from "../../../src"
import { versionCheck } from "../../../src/util/nodeVersionCheck"

describe("InProcessFirestore collectionGroup stream", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    if (versionCheck() >= 12) {
        test(".collectionGroup()", async () => {
            // Given there is a collection
            firestore.resetStorage({
                topLevelCollection: {
                    myCollection: {
                        id1: { field: "value 1" },
                        id2: { field: "value 2" },
                        id3: { field: "value 3" },
                    },
                },
                anotherCollection: {
                    myCollection: {
                        idA: { field: "value A" },
                        idB: { field: "value B" },
                    },
                },
            })

            // When we stream the collectionGroup
            const collectionSnapshot = await firestore
                .collectionGroup("myCollection")
                .stream()
            const incomingSnapshots: InProcessFirestoreDocumentSnapshot[] = []

            collectionSnapshot.on(
                "data",
                (documents: InProcessFirestoreDocumentSnapshot) => {
                    incomingSnapshots.push(documents)
                },
            )

            // Then we should get the expected collectionGroup
            collectionSnapshot.on("end", () => {
                expect(
                    incomingSnapshots.map(
                        (collectionItem) => collectionItem.exists,
                    ),
                ).toEqual([true, true, true, true, true])

                expect(
                    incomingSnapshots.map(
                        (collectionItem) => collectionItem.id,
                    ),
                ).toEqual(["id1", "id2", "id3", "idA", "idB"])
                expect(
                    incomingSnapshots.map((collectionItem) =>
                        collectionItem.data(),
                    ),
                ).toEqual([
                    { field: "value 1" },
                    { field: "value 2" },
                    { field: "value 3" },
                    { field: "value A" },
                    { field: "value B" },
                ])
            })
        })

        test(".collectionGroup() non-existent", async () => {
            // Given there is a collection
            firestore.resetStorage({
                topLevelCollection: {
                    myCollection: {
                        id1: { field: "value 1" },
                        id2: { field: "value 2" },
                        id3: { field: "value 3" },
                    },
                },
                anotherCollection: {
                    myCollection: {
                        idA: { field: "value A" },
                        idB: { field: "value B" },
                    },
                },
            })

            // When we get a non-existent collection;
            const collectionSnapshot = await firestore
                .collectionGroup("honestPoliticians")
                .stream()
            const incomingSnapshots: InProcessFirestoreDocumentSnapshot[] = []

            collectionSnapshot.on(
                "data",
                (documents: InProcessFirestoreDocumentSnapshot) => {
                    incomingSnapshots.push(documents)
                },
            )

            // Then we should stream the expected non-existent collection.
            collectionSnapshot.on("end", () => {
                expect(incomingSnapshots.length).toBe(0)
            })
        })
    } else {
        test("Can't run this suite of tests if node version is less than 12", () =>
            expect(() =>
                firestore.collectionGroup("topCollection").stream(),
            ).toThrowError())
    }
})
