import {
    InProcessFirestore,
    InProcessFirestoreDocumentSnapshot,
} from "../../../src"

describe("InProcessFirestore stream", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test(".collection()", async () => {
        // Given there is a collection;
        firestore.resetStorage({
            myCollection: {
                id1: { field: "value 1" },
                id2: { field: "value 2" },
                id3: { field: "value 3" },
            },
        })

        // When we stream the collection;
        const collectionSnapshot = await firestore
            .collection("myCollection")
            .stream()
        const incomingSnapshots: InProcessFirestoreDocumentSnapshot[] = []

        collectionSnapshot.on(
            "data",
            (documents: InProcessFirestoreDocumentSnapshot) => {
                incomingSnapshots.push(documents)
            },
        )

        // Then we should get the expected collection.
        collectionSnapshot.on("end", () => {
            expect(
                incomingSnapshots.map(
                    (collectionItem) => collectionItem.exists,
                ),
            ).toEqual([true, true, true])

            expect(
                incomingSnapshots.map((collectionItem) => collectionItem.id),
            ).toEqual(["id1", "id2", "id3"])
            expect(
                incomingSnapshots.map((collectionItem) =>
                    collectionItem.data(),
                ),
            ).toEqual([
                { field: "value 1" },
                { field: "value 2" },
                { field: "value 3" },
            ])
        })
    })

    test(".collection() non-existent", async () => {
        // Given there is a collection;
        firestore.resetStorage({
            myCollection: {
                id1: { field: "value 1" },
                id2: { field: "value 2" },
                id3: { field: "value 3" },
            },
        })

        // When we get a non-existent collection;
        const collectionSnapshot = await firestore
            .collection("honestPoliticians")
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

    test(".collection().doc().collection()", async () => {
        // Given there is a collection with a doc and nested collection;
        firestore.resetStorage({
            topCollection: {
                id1: {
                    field: "value 1",
                    subCollection: {
                        subId1: { field: "value 1" },
                        subId2: { field: "value 2" },
                        subId3: { field: "value 3" },
                    },
                },
            },
        })

        // When we get the nested collection;
        const collectionSnapshot = await firestore
            .collection("topCollection")
            .doc("id1")
            .collection("subCollection")
            .stream()
        const incomingSnapshots: InProcessFirestoreDocumentSnapshot[] = []

        collectionSnapshot.on(
            "data",
            (documents: InProcessFirestoreDocumentSnapshot) => {
                incomingSnapshots.push(documents)
            },
        )

        // Then we should stream the expected collection.
        collectionSnapshot.on("end", () => {
            expect(
                incomingSnapshots.map(
                    (collectionItem) => collectionItem.exists,
                ),
            ).toEqual([true, true, true])

            expect(
                incomingSnapshots.map((collectionItem) => collectionItem.id),
            ).toEqual(["subId1", "subId2", "subId3"])
            expect(
                incomingSnapshots.map((collectionItem) =>
                    collectionItem.data(),
                ),
            ).toEqual([
                { field: "value 1" },
                { field: "value 2" },
                { field: "value 3" },
            ])
        })
    })

    test(".collection().doc().collection() non-existent", async () => {
        // Given there is a collection with a doc and nested collection;
        firestore.resetStorage({
            topCollection: {
                id1: {
                    field: "value 1",
                    subCollection: {
                        subId1: { field: "value 1" },
                        subId2: { field: "value 2" },
                        subId3: { field: "value 3" },
                    },
                },
            },
        })

        // When we stream a non-existent collection;
        const collectionSnapshot = await firestore
            .collection("topCollection")
            .doc("id1")
            .collection("honestPoliticians")
            .stream()

        const incomingSnapshots: InProcessFirestoreDocumentSnapshot[] = []

        collectionSnapshot.on(
            "data",
            (documents: InProcessFirestoreDocumentSnapshot) => {
                incomingSnapshots.push(documents)
            },
        )

        // Then we should get the expected non-existent collection.
        collectionSnapshot.on("end", () => {
            expect(incomingSnapshots.length).toBe(0)
        })
    })
})
