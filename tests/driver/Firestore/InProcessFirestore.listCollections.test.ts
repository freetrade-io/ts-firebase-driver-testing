import { InProcessFirestore } from "../../../src"

describe("In-process Firestore doc listing collections", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("list collections empty doc", async () => {
        // Given an empty doc;
        const docRef = db.collection("animals").doc("tiger")

        // When we list collections;
        const listedCollections = await docRef.listCollections()

        // Then it should be empty.
        expect(listedCollections).toHaveLength(0)
        expect(listedCollections).toStrictEqual([])
    })

    test("list collections on doc", async () => {
        // Given an empty doc with some collections;
        await db
            .collection("animals")
            .doc("tiger")
            .collection("limbs")
            .add({ name: "front leg" })
        await db
            .collection("animals")
            .doc("tiger")
            .collection("eyes")
            .add({ name: "left eye" })
        await db
            .collection("animals")
            .doc("tiger")
            .collection("colours")
            .add({ name: "orange" })

        // When we list collection;
        const listedCollections = await db
            .collection("animals")
            .doc("tiger")
            .listCollections()

        // Then we should get references to all the collections.
        expect(listedCollections).toHaveLength(3)
    })
})
