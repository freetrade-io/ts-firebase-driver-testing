import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore set", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.reset()
    })

    test(".doc().set() new", async () => {
        // When we set a new document in a collection;
        await firestore
            .collection("myCollection")
            .doc("thing")
            .set({
                name: "thing",
                good: true,
            })

        // Then the data should be stored correctly;
        const stored = await firestore
            .collection("myCollection")
            .doc("thing")
            .get()
        expect(stored.exists).toBe(true)
        expect(stored.data()).toEqual({
            name: "thing",
            good: true,
        })
    })

    test(".doc().set() existing", async () => {
        // Given there is a doc;
        firestore.reset({
            myCollection: {
                id1: { field: "value 1" },
            },
        })

        // When we set the doc with a different value;
        await firestore
            .collection("myCollection")
            .doc("id1")
            .set({ foo: "bar", amount: 123 })

        // Then the data should be stored correctly;
        const stored = await firestore
            .collection("myCollection")
            .doc("id1")
            .get()
        expect(stored.exists).toBe(true)
        expect(stored.data()).toEqual({ foo: "bar", amount: 123 })
    })

    test(".doc().set() merge", async () => {
        // Given there is a doc;
        firestore.reset({
            myCollection: {
                id1: { field1: "value 1", field2: "value 2" },
            },
        })

        // When we set the doc with a different value, using merge;
        await firestore
            .collection("myCollection")
            .doc("id1")
            .set(
                { field2: "new value 2", foo: "bar", amount: 123 },
                { merge: true },
            )

        // Then the data should be stored correctly;
        const stored = await firestore
            .collection("myCollection")
            .doc("id1")
            .get()
        expect(stored.exists).toBe(true)
        expect(stored.data()).toEqual({
            field1: "value 1",
            field2: "new value 2",
            foo: "bar",
            amount: 123,
        })
    })

    test(".doc().update()", async () => {
        // Given there is a doc;
        firestore.reset({
            myCollection: {
                id1: { field1: "value 1", field2: "value 2" },
            },
        })

        // When we update the doc with a different value;
        await firestore
            .collection("myCollection")
            .doc("id1")
            .update({ field2: "new value 2", foo: "bar", amount: 123 })

        // Then the data should be stored correctly;
        const stored = await firestore
            .collection("myCollection")
            .doc("id1")
            .get()
        expect(stored.exists).toBe(true)
        expect(stored.data()).toEqual({
            field1: "value 1",
            field2: "new value 2",
            foo: "bar",
            amount: 123,
        })
    })

    test(".collection().add()", async () => {
        // Given Firestore can auto-generate ids;
        firestore.makeId = () => "foobar-id-123"

        // When we add a new doc to a collection;
        const doc = await firestore
            .collection("myCollection")
            .add({ foo: "bar", amount: 123 })

        // Then we should get the right result;
        expect(doc.exists).toBe(true)
        expect(doc.id).toBe("foobar-id-123")
        expect(doc.data()).toEqual({ foo: "bar", amount: 123 })

        // And the data should be stored correctly.
        const storedDoc = await firestore
            .collection("myCollection")
            .doc("foobar-id-123")
            .get()

        expect(storedDoc.exists).toBe(true)
        expect(storedDoc.id).toBe("foobar-id-123")
        expect(storedDoc.data()).toEqual({ foo: "bar", amount: 123 })
    })

    test(".collection().doc().set() auto-id", async () => {
        // Given Firestore can auto-generate ids;
        firestore.makeId = () => "foobar-id-123"

        // When we get a new doc without specifying the path;
        const doc = firestore.collection("myCollection").doc()

        // And set the doc;
        await doc.set({ coffee: "yes", amount: 9000 })

        // Then the data should be stored correctly;
        const stored = await firestore
            .collection("myCollection")
            .doc("foobar-id-123")
            .get()
        expect(stored.exists).toBe(true)
        expect(stored.data()).toEqual({ coffee: "yes", amount: 9000 })
    })
})
