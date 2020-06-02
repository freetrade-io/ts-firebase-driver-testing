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

    test("whole object overwrite example from docs", async () => {
        // https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects

        // Given an initial data structure with nested fields in Firestore;
        await firestore
            .collection("users")
            .doc("Frank")
            .set({
                name: "Frank",
                favorites: {
                    food: "Pizza",
                    color: "Blue",
                    subject: "Recess",
                },
                age: 12,
            })

        // When we update a whole nested object;
        await firestore
            .collection("users")
            .doc("Frank")
            .update({
                favorites: {
                    food: "Ice Cream",
                },
            })

        // Then that whole object should be overwritten.
        const snapshot = await firestore
            .collection("users")
            .doc("Frank")
            .get()
        expect(snapshot.exists).toBe(true)
        expect(snapshot.data()).toEqual({
            name: "Frank",
            age: 12,
            favorites: {
                food: "Ice Cream",
            },
        })
    })

    test("overwrites non-nested whole object", async () => {
        // Given a document with some nested fields;
        await firestore
            .collection("users")
            .doc("Frank")
            .set({
                favorites1: { some: "thing" },
                favorites2: { some: "other thing" },
            })

        // When we update some whole objects and some nested paths;
        await firestore
            .collection("users")
            .doc("Frank")
            .update({ favorites1: { foo: "bar" }, "favorites2.blah": "hello" })

        // Then the whole objects should get overwritten, and the nested paths
        // should get updated in isolation.
        const snapshot = await firestore
            .collection("users")
            .doc("Frank")
            .get()
        expect(snapshot.exists).toBe(true)
        expect(snapshot.data()).toEqual({
            favorites1: { foo: "bar" },
            favorites2: { some: "other thing", blah: "hello" },
        })
    })
})
