import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore orderBy", () => {
    let db: InProcessFirestore

    beforeEach(() => {
        db = new InProcessFirestore()
    })

    test("orderBy string asc", async () => {
        // Given there is a collection of with a string field;
        await db.collection("animals").add({ id: 1, name: "elephant" })
        await db.collection("animals").add({ id: 2, name: "badger" })
        await db.collection("animals").add({ id: 3, name: "aardvark" })
        await db.collection("animals").add({ id: 4, name: "donkey" })
        await db.collection("animals").add({ id: 5, name: "camel" })

        // When we order the collection by that field;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .get()

        // Then we should get the collection ordered by that field.
        const docs: Array<{
            id: number
            name: string
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.name)).not.toStrictEqual([
            "elephant",
            "badger",
            "aardvark",
            "donkey",
            "camel",
        ])
        expect(docs.map((doc) => doc.name)).toStrictEqual([
            "aardvark",
            "badger",
            "camel",
            "donkey",
            "elephant",
        ])
        expect(docs).toStrictEqual([
            { id: 3, name: "aardvark" },
            { id: 2, name: "badger" },
            { id: 5, name: "camel" },
            { id: 4, name: "donkey" },
            { id: 1, name: "elephant" },
        ])
    })

    test("orderBy string desc", async () => {
        //
    })

    test("orderBy number asc", async () => {
        //
    })

    test("orderBy number desc", async () => {
        //
    })

    test("orderBy date asc", async () => {
        //
    })

    test("orderBy date desc", async () => {
        //
    })
})
