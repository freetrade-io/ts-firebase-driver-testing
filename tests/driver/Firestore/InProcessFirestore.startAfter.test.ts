import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore start after query", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.reset()
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
        expect(result.docs).toHaveLength(0)
        expect(result.docs.map((doc) => doc.data())).toStrictEqual([])
    })
})
