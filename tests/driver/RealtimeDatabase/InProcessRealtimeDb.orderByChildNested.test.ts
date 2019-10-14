import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef.orderByChild", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("InProcessRealtimeDatabaseRef.orderByChild", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // And the collection is not ordered by that nested child value;
        expect(
            Object.values(dataset).map((u) => u.favourites.animal),
        ).toStrictEqual(["elephant", "badger", "aardvark", "donkey", "camel"])

        // When we get the collection ordered by a nested child field;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .once("value")

        // Then we should get a string ordering of the objects by that nested
        // child field.
        expect(snapshot.val()).toStrictEqual({
            h: { id: "3", favourites: { animal: "aardvark" } },
            g: { id: "2", favourites: { animal: "badger" } },
            j: { id: "5", favourites: { animal: "camel" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            f: { id: "1", favourites: { animal: "elephant" } },
        })
        expect(
            Object.values(snapshot.val()).map(
                (u) => (u as any).favourites.animal,
            ),
        ).toStrictEqual(["aardvark", "badger", "camel", "donkey", "elephant"])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.equalTo single", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we filter to items with a child field equal to a value;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .equalTo("badger")
            .once("value")

        // Then we should get the single item with the nested child field equal
        // to that value.
        expect(snapshot.val()).toStrictEqual({
            g: { id: "2", favourites: { animal: "badger" } },
        })
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.equalTo multiple", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            i: { id: "4", favourites: { animal: "badger" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we filter to items with a child field equal to a value;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .equalTo("badger")
            .once("value")

        // Then we should get the multiple items with the nested child field
        // equal to that value.
        expect(snapshot.val()).toStrictEqual({
            g: { id: "2", favourites: { animal: "badger" } },
            i: { id: "4", favourites: { animal: "badger" } },
        })
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.startAt", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            k: { id: "6", favourites: { animal: "fox" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we filter to items with the nested child field starting at a value;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .startAt("camel")
            .once("value")

        // Then we should get the items ordered starting from the child field equal to that value.
        expect(snapshot.val()).toStrictEqual({
            j: { id: "5", favourites: { animal: "camel" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            f: { id: "1", favourites: { animal: "elephant" } },
            k: { id: "6", favourites: { animal: "fox" } },
        })
        expect(
            Object.values(snapshot.val()).map(
                (u) => (u as any).favourites.animal,
            ),
        ).toStrictEqual(["camel", "donkey", "elephant", "fox"])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.endAt", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            k: { id: "6", favourites: { animal: "fox" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we filter to items with the nested child field ending at a value;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .endAt("camel")
            .once("value")

        // Then we should get the items ordered ending at the child field equal to that value.
        expect(snapshot.val()).toStrictEqual({
            h: { id: "3", favourites: { animal: "aardvark" } },
            g: { id: "2", favourites: { animal: "badger" } },
            j: { id: "5", favourites: { animal: "camel" } },
        })
        expect(
            Object.values(snapshot.val()).map(
                (u) => (u as any).favourites.animal,
            ),
        ).toStrictEqual(["aardvark", "badger", "camel"])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.startAt.endAt", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            k: { id: "6", favourites: { animal: "fox" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we filter to items with a child field starting at one value and ending at another;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .startAt("camel")
            .endAt("elephant")
            .once("value")

        // Then we should get the items ordered starting at the child field equal
        // to the first value and ending at the other.
        expect(snapshot.val()).toStrictEqual({
            j: { id: "5", favourites: { animal: "camel" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            f: { id: "1", favourites: { animal: "elephant" } },
        })
        expect(
            Object.values(snapshot.val()).map(
                (u) => (u as any).favourites.animal,
            ),
        ).toStrictEqual(["camel", "donkey", "elephant"])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.limitToFirst", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            k: { id: "6", favourites: { animal: "fox" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we order items with a child field limited to the first three;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .limitToFirst(3)
            .once("value")

        // Then we should get the first three items.
        expect(snapshot.val()).toStrictEqual({
            h: { id: "3", favourites: { animal: "aardvark" } },
            g: { id: "2", favourites: { animal: "badger" } },
            j: { id: "5", favourites: { animal: "camel" } },
        })
        expect(
            Object.values(snapshot.val()).map(
                (u) => (u as any).favourites.animal,
            ),
        ).toStrictEqual(["aardvark", "badger", "camel"])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.limitToLast", async () => {
        // Given a collection of objects with a nested child field;
        const dataset = {
            f: { id: "1", favourites: { animal: "elephant" } },
            g: { id: "2", favourites: { animal: "badger" } },
            h: { id: "3", favourites: { animal: "aardvark" } },
            k: { id: "6", favourites: { animal: "fox" } },
            i: { id: "4", favourites: { animal: "donkey" } },
            j: { id: "5", favourites: { animal: "camel" } },
        }

        await database.ref("users").set(dataset)

        // When we order items with a child field limited to the last three;
        const snapshot = await database
            .ref("users")
            .orderByChild("favourites/animal")
            .limitToLast(3)
            .once("value")

        // Then we should get the last three items.
        expect(snapshot.val()).toStrictEqual({
            i: { id: "4", favourites: { animal: "donkey" } },
            f: { id: "1", favourites: { animal: "elephant" } },
            k: { id: "6", favourites: { animal: "fox" } },
        })
        expect(
            Object.values(snapshot.val()).map(
                (u) => (u as any).favourites.animal,
            ),
        ).toStrictEqual(["donkey", "elephant", "fox"])
    })
})
