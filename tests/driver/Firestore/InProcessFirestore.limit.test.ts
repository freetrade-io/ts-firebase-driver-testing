import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore limit queries", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.reset()
    })

    test("limit less than total size", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "tiger" })
        await db.collection("animals").add({ name: "elephant" })
        await db.collection("animals").add({ name: "kangaroo" })

        // When we limit it to less than the total number of items;
        const result = await db
            .collection("animals")
            .limit(2)
            .get()

        // Then we should get those items only.
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger" },
            { name: "elephant" },
        ])
    })

    test("limit equal to total size", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "tiger" })
        await db.collection("animals").add({ name: "elephant" })
        await db.collection("animals").add({ name: "kangaroo" })

        // When we limit it to the total number of items;
        const result = await db
            .collection("animals")
            .limit(3)
            .get()

        // Then we should get all the items.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger" },
            { name: "elephant" },
            { name: "kangaroo" },
        ])
    })

    test("limit more than total size", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "tiger" })
        await db.collection("animals").add({ name: "elephant" })
        await db.collection("animals").add({ name: "kangaroo" })

        // When we limit it to more than the total number of items;
        const result = await db
            .collection("animals")
            .limit(5)
            .get()

        // Then we should get all the items.
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger" },
            { name: "elephant" },
            { name: "kangaroo" },
        ])
    })
})
