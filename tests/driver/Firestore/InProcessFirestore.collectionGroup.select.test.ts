import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore select query on collectionGroup", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("select single field", async () => {
        // Given some data in a collection;
        await db
            .collection("livingthings/animals")
            .add({ name: "tiger", continent: "asia" })
        await db
            .collection("livingthings/animals")
            .add({ name: "elephant", continent: "africa" })
        await db
            .collection("livingthings/animals")
            .add({ name: "kangaroo", continent: "oceania" })

        // When we select only a single field;
        const result = await db
            .collectionGroup("animals")
            .select("continent")
            .get()

        // Then we should only get that field on each doc.
        expect(result.size).toBe(3)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { continent: "asia" },
            { continent: "africa" },
            { continent: "oceania" },
        ])
    })

    test("select multiple fields", async () => {
        // Given some data in a collection;
        await db
            .collection("livingthings/animals")
            .add({ name: "tiger", continent: "asia", colour: "orange" })
        await db
            .collection("livingthings/animals")
            .add({ name: "elephant", continent: "africa", colour: "grey" })
        await db
            .collection("livingthings/animals")
            .add({ name: "kangaroo", continent: "oceania", colour: "brown" })

        // When we select only multiple fields;
        const result = await db
            .collectionGroup("animals")
            .select("name", "continent")
            .get()

        // Then we should only get those fields on each doc.
        expect(result.size).toBe(3)
        expect(result.empty).toBeFalsy()
        expect(result.docs).toHaveLength(3)
        expect(result.docs.map((doc) => doc.data())).toEqual([
            { name: "tiger", continent: "asia" },
            { name: "elephant", continent: "africa" },
            { name: "kangaroo", continent: "oceania" },
        ])
    })
})
