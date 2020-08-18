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
})
