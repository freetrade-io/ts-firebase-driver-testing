import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore dot-path update", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test("nested field update example from docs", async () => {
        // https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects

        // Given an initial data structure with nested fields in Firestore;
        const initialData = {
            name: "Frank",
            age: 12,
            favorites: {
                food: "Pizza",
                color: "Blue",
                subject: "recess",
            },
        }
        await firestore
            .collection("users")
            .doc("Frank")
            .set(initialData)

        // When we updated a nested field using dot path notation;
        await firestore
            .collection("users")
            .doc("Frank")
            .update({
                age: 13,
                "favorites.color": "Red",
            })

        // Then the update should be made correctly.
        const snapshot = await firestore
            .collection("users")
            .doc("Frank")
            .get()
        expect(snapshot.exists).toBe(true)
        expect(snapshot.data()).toEqual({
            name: "Frank",
            age: 13,
            favorites: {
                food: "Pizza",
                color: "Red",
                subject: "recess",
            },
        })
    })
})
