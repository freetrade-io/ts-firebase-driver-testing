import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore offset queries", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("offset less than total size", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "cat" })
        await db.collection("animals").add({ name: "ant" })
        await db.collection("animals").add({ name: "bee" })

        // When we offset by one item with deterministic ordering;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .offset(1)
            .get()

        // Then we should get the remaining items.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "bee" },
            { name: "cat" },
        ])
    })

    test("offset equal to total size", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "cat" })
        await db.collection("animals").add({ name: "ant" })
        await db.collection("animals").add({ name: "bee" })

        // When we offset by the total number of rows;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .offset(3)
            .get()

        // Then the result should be empty.
        expect(result.size).toBe(0)
        expect(result.empty).toBeTruthy()
        expect(result.docs).toHaveLength(0)
    })

    test("offset composes with limit for pagination", async () => {
        // Given some data in a collection;
        await db.collection("animals").add({ name: "dog" })
        await db.collection("animals").add({ name: "cat" })
        await db.collection("animals").add({ name: "ant" })
        await db.collection("animals").add({ name: "bee" })

        // When we request a page using offset + limit;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .offset(1)
            .limit(2)
            .get()

        // Then we should get the expected page.
        expect(result.size).toBe(2)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(2)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "bee" },
            { name: "cat" },
        ])
    })
})
