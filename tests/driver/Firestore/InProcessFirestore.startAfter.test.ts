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

    test("startAfter document id using document ref", async () => {
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

    test("startAfter descending order, including half", async () => {
        // Given some data in a collection
        await db.collection("animals").add({ name: "aardvark" })
        await db.collection("animals").add({ name: "badger" })
        await db.collection("animals").add({ name: "camel" })
        await db.collection("animals").add({ name: "donkey" })
        // When we get the items starting after half of them
        const result = await db
            .collection("animals")
            .orderBy("name", "desc")
            .startAfter("camel")
            .get()

        // Then we should get the second half of the items
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "badger" },
            { name: "aardvark" },
        ])
    })

    test("startAfter on mixed data types", async () => {
        // Given mixed data types in a single field
        await db.collection("misc").add({ type: "string" })
        await db.collection("misc").add({ type: 42 })
        await db.collection("misc").add({ type: "another string" })
        await db.collection("misc").add({ type: 100 })

        // When we try to order by type in descending order and start after a numeric value
        const result = await db
            .collection("misc")
            .orderBy("type", "desc")
            .startAfter(50)
            .get()

        // Then we should get items before the numeric '50' in descending order
        expect(result.size).toBeGreaterThan(0)
        expect(result.empty).toBeFalsy()
        expect(result.docs.map((doc) => doc.data().type)).toEqual([42])
    })

    test("startAfter on non-unique field values", async () => {
        // Given multiple items with the same field value
        await db.collection("items").add({ rating: 5 })
        await db.collection("items").add({ rating: 5 })
        await db.collection("items").add({ rating: 5 })

        // When we start after a common rating value in descending order
        const result = await db
            .collection("items")
            .orderBy("rating", "desc")
            .startAfter(5)
            .get()

        // Then we should get no items since all items have the same rating and we started after the common value
        expect(result.size).toEqual(0)
        expect(result.empty).toBeTruthy()
    })

    test("startAfter the last document in descending order", async () => {
        // Given a list of items sorted in descending order
        await db.collection("products").add({ price: 100 })
        await db.collection("products").add({ price: 200 })
        await db.collection("products").add({ price: 300 })

        // When we start after the lowest price in descending order
        const result = await db
            .collection("products")
            .orderBy("price", "desc")
            .startAfter(100)
            .get()

        // Then we should get no items since we started after the first item
        expect(result.size).toEqual(0)
        expect(result.empty).toBeTruthy()
    })

    test("startAfter with empty collection", async () => {
        // When we start after any value in an empty collection in descending order
        const result = await db
            .collection("empty")
            .orderBy("anyField", "desc")
            .startAfter("anyValue")
            .get()

        // Then we should get no items
        expect(result.size).toEqual(0)
        expect(result.empty).toBeTruthy()
    })
})
