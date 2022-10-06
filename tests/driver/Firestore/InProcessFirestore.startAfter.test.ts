import { FieldPath } from "../../../src/driver/Firestore/FieldPath"
import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore start after query", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("startAfter including all", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "aardvark" })
        await db.collection("animals").add({ name: "donkey" })
        await db.collection("animals").add({ name: "camel" })
        await db.collection("animals").add({ name: "badger" })

        // When we get the items starting after a value lower than all of them;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .startAfter("a")
            .get()

        // Then we should get all the items.
        expect(result.size).toBe(4)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(4)
        expect(result.docs.map((doc) => doc.data())).toStrictEqual([
            { name: "aardvark" },
            { name: "badger" },
            { name: "camel" },
            { name: "donkey" },
        ])
    })

    test("startAfter including half", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "aardvark" })
        await db.collection("animals").add({ name: "donkey" })
        await db.collection("animals").add({ name: "camel" })
        await db.collection("animals").add({ name: "badger" })

        // When we get the items starting after half of them;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .startAfter("badger")
            .get()

        // Then we should get the second half of the items.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.data())).toStrictEqual([
            { name: "camel" },
            { name: "donkey" },
        ])
    })

    test("startAfter including none", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "aardvark" })
        await db.collection("animals").add({ name: "donkey" })
        await db.collection("animals").add({ name: "camel" })
        await db.collection("animals").add({ name: "badger" })

        // When we get the items starting after all of them;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .startAfter("donkey")
            .get()

        // Then we should get no items.
        expect(result.size).toBe(0)
        expect(result.empty).toBeTruthy()
        expect(result.docs).toHaveLength(0)
        expect(result.docs.map((doc) => doc.data())).toStrictEqual([])
    })

    test("startAfter nested document", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ view: { name: "aardvark" } })
        await db.collection("animals").add({ view: { name: "donkey" } })
        await db.collection("animals").add({ view: { name: "camel" } })
        await db.collection("animals").add({ view: { name: "badger" } })

        // When we get the items starting after half of them;
        const result = await db
            .collection("animals")
            .orderBy("view.name")
            .startAfter("badger")
            .get()

        // Then we should get the second half of the items.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.data())).toStrictEqual([
            { view: { name: "camel" } },
            { view: { name: "donkey" } },
        ])
    })

    test("startAfter document id", async () => {
        // Given there is a collection of documents with ids;
        await db.doc("animals/22da618d").set({ name: "aardvark" })
        await db.doc("animals/00a3382").set({ name: "badger" })
        await db.doc("animals/11cbe6b5").set({ name: "camel" })

        // When we order the collection by the document id;
        const result = await db
            .collection("animals")
            .orderBy(FieldPath.documentId())
            .startAfter("11cbe6b5")
            .get()

        // Then we should get the collection ordered by that field.
        expect(result.size).toEqual(1)
        expect(
            result.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
        ).toStrictEqual([{ id: "22da618d", data: { name: "aardvark" } }])
    })

    test("startAfter document id", async () => {
        // Given there is a collection of documents with ids;
        await db.doc("animals/22da618d").set({ name: "aardvark" })
        await db.doc("animals/00a3382").set({ name: "badger" })
        await db.doc("animals/11cbe6b5").set({ name: "camel" })

        const startAfterDoc = db.doc("livingthings/animals/11cbe6b5")

        // When we order the collection by the document id;
        const result = await db
            .collection("animals")
            .orderBy(FieldPath.documentId())
            .startAfter(startAfterDoc)
            .get()

        // Then we should get the collection ordered by that field.
        expect(result.size).toEqual(1)
        expect(
            result.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
        ).toStrictEqual([{ id: "22da618d", data: { name: "aardvark" } }])
    })

    test("startAfter document id using document snapshot", async () => {
        // Given there is a collection of documents with ids;
        await db.doc("animals/22da618d").set({ name: "aardvark" })
        await db.doc("animals/00a3382").set({ name: "badger" })
        await db.doc("animals/11cbe6b5").set({ name: "camel" })

        const startAfterDoc = await db
            .doc("livingthings/animals/11cbe6b5")
            .get()

        // When we order the collection by the document id;
        const result = await db
            .collection("animals")
            .orderBy(FieldPath.documentId())
            .startAfter(startAfterDoc)
            .get()

        // Then we should get the collection ordered by that field.
        expect(result.size).toEqual(1)
        expect(
            result.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
        ).toStrictEqual([{ id: "22da618d", data: { name: "aardvark" } }])
    })

    test("startAfter document id after using doc ref", async () => {
        // Given there is a collection of documents with ids;
        await db.doc("animals/22da618d").set({ name: "aardvark" })
        const startAfterDoc = db.doc("animals/22da618d")

        // When we order the collection by the document id;
        const result = await db
            .collection("animals")
            .orderBy(FieldPath.documentId())
            .startAfter(startAfterDoc)
            .get()

        // Then we should get no items
        expect(result.size).toEqual(0)
    })

    test("startAfter document id after using doc snapshot", async () => {
        // Given there is a collection of documents with ids;
        await db.doc("animals/22da618d").set({ name: "aardvark" })
        const startAfterDoc = await db.doc("animals/22da618d").get()

        // When we order the collection by the document id;
        const result = await db
            .collection("animals")
            .orderBy(FieldPath.documentId())
            .startAfter(startAfterDoc)
            .get()

        // Then we should get no items
        expect(result.size).toEqual(0)
    })
})
