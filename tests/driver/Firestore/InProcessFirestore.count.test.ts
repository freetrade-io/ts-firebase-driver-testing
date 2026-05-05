import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore count queries", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("count applies filters and does not consume the base query", async () => {
        await db.collection("animals").add({ name: "tiger", cat: true })
        await db.collection("animals").add({ name: "elephant", cat: false })
        await db.collection("animals").add({ name: "lion", cat: true })
        await db.collection("animals").add({ name: "jaguar", cat: true })

        const baseQuery = db.collection("animals").where("cat", "==", true)
        const countSnapshot = await baseQuery.count().get()
        const querySnapshot = await baseQuery.get()

        expect(countSnapshot.data().count).toBe(3)
        expect(querySnapshot.size).toBe(3)
    })

    test("count applies limit and offset constraints", async () => {
        await db.collection("animals").add({ name: "tiger" })
        await db.collection("animals").add({ name: "elephant" })
        await db.collection("animals").add({ name: "kangaroo" })
        await db.collection("animals").add({ name: "aardvark" })

        const limitedCount = await db
            .collection("animals")
            .orderBy("name")
            .limit(2)
            .count()
            .get()

        const offsetCount = await db
            .collection("animals")
            .orderBy("name")
            .offset(1)
            .count()
            .get()

        expect(limitedCount.data().count).toBe(2)
        expect(offsetCount.data().count).toBe(3)
    })
})
