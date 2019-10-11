import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef.orderByChild", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test("InProcessRealtimeDatabaseRef.orderByChild", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "four",
            "two",
            "one",
            "five",
            "three",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])
        expect(Object.values(dataset)).toStrictEqual([
            { date: "2019-09-04" },
            { date: "2019-09-02" },
            { date: "2019-09-01" },
            { date: "2019-09-05" },
            { date: "2019-09-03" },
        ])
        expect(Object.values(dataset)).not.toStrictEqual([
            { date: "2019-09-01" },
            { date: "2019-09-02" },
            { date: "2019-09-03" },
            { date: "2019-09-04" },
            { date: "2019-09-05" },
        ])

        // When we get the collection ordered by the child field;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .once("value")

        // Then we should get a string ordering of the objects by that field.
        expect(snapshot.val()).toStrictEqual({
            one: { date: "2019-09-01" },
            two: { date: "2019-09-02" },
            three: { date: "2019-09-03" },
            four: { date: "2019-09-04" },
            five: { date: "2019-09-05" },
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "four",
            "two",
            "one",
            "five",
            "three",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            { date: "2019-09-01" },
            { date: "2019-09-02" },
            { date: "2019-09-03" },
            { date: "2019-09-04" },
            { date: "2019-09-05" },
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            { date: "2019-09-04" },
            { date: "2019-09-02" },
            { date: "2019-09-01" },
            { date: "2019-09-05" },
            { date: "2019-09-03" },
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.equalTo single", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // When we filter to items with a child field equal to a value;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .equalTo("2019-09-05")
            .once("value")

        // Then we should get the single item with the child field equal to that value.
        expect(snapshot.val()).toStrictEqual({ five: { date: "2019-09-05" } })
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.equalTo multiple", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            six: { date: "2019-09-08" },
            four: { date: "2019-09-05" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // When we filter to items with a child field equal to a value;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .equalTo("2019-09-05")
            .once("value")

        // Then we should get the multiple items with the child field equal to that value.
        expect(snapshot.val()).toStrictEqual({
            four: { date: "2019-09-05" },
            five: { date: "2019-09-05" },
        })
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.startAt", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "four",
            "two",
            "one",
            "five",
            "three",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we filter to items with a child field starting at a value;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .startAt("2019-09-03")
            .once("value")

        // Then we should get the items ordered starting from the child field equal to that value.
        expect(snapshot.val()).toStrictEqual({
            three: { date: "2019-09-03" },
            four: { date: "2019-09-04" },
            five: { date: "2019-09-05" },
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "three",
            "four",
            "five",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "four",
            "five",
            "three",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            { date: "2019-09-03" },
            { date: "2019-09-04" },
            { date: "2019-09-05" },
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            { date: "2019-09-04" },
            { date: "2019-09-05" },
            { date: "2019-09-03" },
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.endAt", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "four",
            "two",
            "one",
            "five",
            "three",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we filter to items with a child field ending at a value;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .endAt("2019-09-03")
            .once("value")

        // Then we should get the items ordered ending at the child field equal to that value.
        expect(snapshot.val()).toStrictEqual({
            one: { date: "2019-09-01" },
            two: { date: "2019-09-02" },
            three: { date: "2019-09-03" },
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "one",
            "two",
            "three",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "two",
            "one",
            "three",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            { date: "2019-09-01" },
            { date: "2019-09-02" },
            { date: "2019-09-03" },
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            { date: "2019-09-02" },
            { date: "2019-09-01" },
            { date: "2019-09-03" },
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.startAt.endAt", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // And the collection is not ordered;
        expect(Object.keys(dataset)).toStrictEqual([
            "four",
            "two",
            "one",
            "five",
            "three",
        ])
        expect(Object.keys(dataset)).not.toStrictEqual([
            "one",
            "two",
            "three",
            "four",
            "five",
        ])

        // When we filter to items with a child field starting at one value and ending at another;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .startAt("2019-09-02")
            .endAt("2019-09-04")
            .once("value")

        // Then we should get the items ordered starting at the child field equal to the first value
        // and ending at the other.
        expect(snapshot.val()).toStrictEqual({
            two: { date: "2019-09-02" },
            three: { date: "2019-09-03" },
            four: { date: "2019-09-04" },
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "two",
            "three",
            "four",
        ])
        expect(Object.keys(snapshot.val())).not.toStrictEqual([
            "four",
            "two",
            "three",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            { date: "2019-09-02" },
            { date: "2019-09-03" },
            { date: "2019-09-04" },
        ])
        expect(Object.values(snapshot.val())).not.toStrictEqual([
            { date: "2019-09-04" },
            { date: "2019-09-02" },
            { date: "2019-09-03" },
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.limitToFirst", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // When we order items with a child field limited to the first three;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .limitToFirst(3)
            .once("value")

        // Then we should get the first three items.
        expect(snapshot.val()).toStrictEqual({
            one: { date: "2019-09-01" },
            two: { date: "2019-09-02" },
            three: { date: "2019-09-03" },
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "one",
            "two",
            "three",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            { date: "2019-09-01" },
            { date: "2019-09-02" },
            { date: "2019-09-03" },
        ])
    })

    test("InProcessRealtimeDatabaseRef.orderByChild.limitToLast", async () => {
        // Given a collection of objects with a string child field;
        const dataset = {
            four: { date: "2019-09-04" },
            two: { date: "2019-09-02" },
            one: { date: "2019-09-01" },
            five: { date: "2019-09-05" },
            three: { date: "2019-09-03" },
        }

        await database.ref("items").set(dataset)

        // When we order items with a child field limited to the last three;
        const snapshot = await database
            .ref("items")
            .orderByChild("date")
            .limitToLast(3)
            .once("value")

        // Then we should get the last three items.
        expect(snapshot.val()).toStrictEqual({
            three: { date: "2019-09-03" },
            four: { date: "2019-09-04" },
            five: { date: "2019-09-05" },
        })
        expect(Object.keys(snapshot.val())).toStrictEqual([
            "three",
            "four",
            "five",
        ])
        expect(Object.values(snapshot.val())).toStrictEqual([
            { date: "2019-09-03" },
            { date: "2019-09-04" },
            { date: "2019-09-05" },
        ])
    })
})
