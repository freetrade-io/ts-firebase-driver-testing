import { InProcessFirestore } from "../../../src"

describe("InProcessFirestore collectionGroup get", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

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

        // When we get the collectionGroup
        const collectionSnapshot = await firestore
            .collectionGroup("myCollection")
            .get()

        // Then we should get the expected collection.
        expect(collectionSnapshot.docs.map((doc) => doc.exists)).toEqual([
            true,
            true,
            true,
            true,
            true,
        ])
        expect(collectionSnapshot.docs.map((doc) => doc.id)).toEqual([
            "id1",
            "id2",
            "id3",
            "idA",
            "idB",
        ])
        expect(collectionSnapshot.docs.map((doc) => doc.data())).toEqual([
            { field: "value 1" },
            { field: "value 2" },
            { field: "value 3" },
            { field: "value A" },
            { field: "value B" },
        ])
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

        // When we try to get the non-existent collectionGroup
        const collectionSnapshot = await firestore
            .collectionGroup("notMyCollection")
            .get()

        // Then we should get the expected non-existent collection.
        expect(collectionSnapshot.size).toBe(0)
        expect(collectionSnapshot.empty).toBeTruthy()
        expect(collectionSnapshot.docs).toHaveLength(0)
        expect(collectionSnapshot.docs).toEqual([])
    })
})
