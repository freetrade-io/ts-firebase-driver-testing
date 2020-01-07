import * as admin from "firebase-admin"
import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"
import FieldPath = admin.firestore.FieldPath

describe("InProcessFirestore orderBy", () => {
    let db: InProcessFirestore

    beforeEach(() => {
        db = new InProcessFirestore()
    })

    test("orderBy string asc", async () => {
        // Given there is a collection of with a string field;
        await db.collection("animals").add({ id: 1, name: "elephant" })
        await db.collection("animals").add({ id: 2, name: "badger" })
        await db.collection("animals").add({ id: 3, name: "aardvark" })
        await db.collection("animals").add({ id: 4, name: "donkey" })
        await db.collection("animals").add({ id: 5, name: "camel" })

        // When we order the collection by that field;
        const result = await db
            .collection("animals")
            .orderBy("name")
            .get()

        // Then we should get the collection ordered by that field.
        const docs: Array<{
            id: number
            name: string
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.name)).not.toStrictEqual([
            "elephant",
            "badger",
            "aardvark",
            "donkey",
            "camel",
        ])
        expect(docs.map((doc) => doc.name)).toStrictEqual([
            "aardvark",
            "badger",
            "camel",
            "donkey",
            "elephant",
        ])
        expect(docs).toStrictEqual([
            { id: 3, name: "aardvark" },
            { id: 2, name: "badger" },
            { id: 5, name: "camel" },
            { id: 4, name: "donkey" },
            { id: 1, name: "elephant" },
        ])
    })

    test("orderBy string desc", async () => {
        // Given there is a collection of with a string field;
        await db.collection("animals").add({ id: 1, name: "elephant" })
        await db.collection("animals").add({ id: 2, name: "badger" })
        await db.collection("animals").add({ id: 3, name: "aardvark" })
        await db.collection("animals").add({ id: 4, name: "donkey" })
        await db.collection("animals").add({ id: 5, name: "camel" })

        // When we order the collection by that field in descending order;
        const result = await db
            .collection("animals")
            .orderBy("name", "desc")
            .get()

        // Then we should get the collection ordered by that field descending.
        const docs: Array<{
            id: number
            name: string
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.name)).not.toStrictEqual([
            "elephant",
            "badger",
            "aardvark",
            "donkey",
            "camel",
        ])
        expect(docs.map((doc) => doc.name)).toStrictEqual([
            "elephant",
            "donkey",
            "camel",
            "badger",
            "aardvark",
        ])
        expect(docs).toStrictEqual([
            { id: 1, name: "elephant" },
            { id: 4, name: "donkey" },
            { id: 5, name: "camel" },
            { id: 2, name: "badger" },
            { id: 3, name: "aardvark" },
        ])
    })

    test("orderBy number asc", async () => {
        // Given there is a collection of with a number field;
        await db.collection("ratings").add({ id: 1, rating: 50000 })
        await db.collection("ratings").add({ id: 2, rating: 0 })
        await db.collection("ratings").add({ id: 3, rating: -2 })
        await db.collection("ratings").add({ id: 4, rating: 101 })
        await db.collection("ratings").add({ id: 5, rating: 1.23 })

        // When we order the collection by that field;
        const result = await db
            .collection("ratings")
            .orderBy("rating")
            .get()

        // Then we should get the collection ordered by that field.
        const docs: Array<{
            id: number
            rating: number
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.rating)).not.toStrictEqual([
            50000,
            0,
            -2,
            101,
            1.23,
        ])
        expect(docs.map((doc) => doc.rating)).toStrictEqual([
            -2,
            0,
            1.23,
            101,
            50000,
        ])
        expect(docs).toStrictEqual([
            { id: 3, rating: -2 },
            { id: 2, rating: 0 },
            { id: 5, rating: 1.23 },
            { id: 4, rating: 101 },
            { id: 1, rating: 50000 },
        ])
    })

    test("orderBy number desc", async () => {
        // Given there is a collection of with a number field;
        await db.collection("ratings").add({ id: 1, rating: 50000 })
        await db.collection("ratings").add({ id: 2, rating: 0 })
        await db.collection("ratings").add({ id: 3, rating: -2 })
        await db.collection("ratings").add({ id: 4, rating: 101 })
        await db.collection("ratings").add({ id: 5, rating: 1.23 })

        // When we order the collection by that field in descending order;
        const result = await db
            .collection("ratings")
            .orderBy("rating", "desc")
            .get()

        // Then we should get the collection ordered by that field.
        const docs: Array<{
            id: number
            rating: number
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.rating)).not.toStrictEqual([
            50000,
            0,
            -2,
            101,
            1.23,
        ])
        expect(docs.map((doc) => doc.rating)).toStrictEqual([
            50000,
            101,
            1.23,
            0,
            -2,
        ])
        expect(docs).toStrictEqual([
            { id: 1, rating: 50000 },
            { id: 4, rating: 101 },
            { id: 5, rating: 1.23 },
            { id: 2, rating: 0 },
            { id: 3, rating: -2 },
        ])
    })

    test("orderBy date asc", async () => {
        // Given there is a collection of with a date field;
        await db
            .collection("dates")
            .add({ id: 1, date: new Date("2020-12-06") })
        await db
            .collection("dates")
            .add({ id: 2, date: new Date("1999-01-15") })
        await db
            .collection("dates")
            .add({ id: 3, date: new Date("1976-05-23") })
        await db
            .collection("dates")
            .add({ id: 4, date: new Date("2009-10-17") })
        await db
            .collection("dates")
            .add({ id: 5, date: new Date("2006-08-08") })

        // When we order the collection by that field;
        const result = await db
            .collection("dates")
            .orderBy("date")
            .get()

        // Then we should get the collection ordered by that field.
        const docs: Array<{
            id: number
            date: Date
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.date)).not.toStrictEqual([
            new Date("2020-12-06"),
            new Date("1999-01-15"),
            new Date("1976-05-23"),
            new Date("2009-10-17"),
            new Date("2006-08-08"),
        ])
        expect(docs.map((doc) => doc.date)).toStrictEqual([
            new Date("1976-05-23"),
            new Date("1999-01-15"),
            new Date("2006-08-08"),
            new Date("2009-10-17"),
            new Date("2020-12-06"),
        ])
        expect(docs).toStrictEqual([
            { id: 3, date: new Date("1976-05-23") },
            { id: 2, date: new Date("1999-01-15") },
            { id: 5, date: new Date("2006-08-08") },
            { id: 4, date: new Date("2009-10-17") },
            { id: 1, date: new Date("2020-12-06") },
        ])
    })

    test("orderBy date desc", async () => {
        // Given there is a collection of with a date field;
        await db
            .collection("dates")
            .add({ id: 1, date: new Date("2020-12-06") })
        await db
            .collection("dates")
            .add({ id: 2, date: new Date("1999-01-15") })
        await db
            .collection("dates")
            .add({ id: 3, date: new Date("1976-05-23") })
        await db
            .collection("dates")
            .add({ id: 4, date: new Date("2009-10-17") })
        await db
            .collection("dates")
            .add({ id: 5, date: new Date("2006-08-08") })

        // When we order the collection by that field in descending order;
        const result = await db
            .collection("dates")
            .orderBy("date", "desc")
            .get()

        // Then we should get the collection ordered by that field descending.
        const docs: Array<{
            id: number
            date: Date
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.date)).not.toStrictEqual([
            new Date("2020-12-06"),
            new Date("1999-01-15"),
            new Date("1976-05-23"),
            new Date("2009-10-17"),
            new Date("2006-08-08"),
        ])
        expect(docs.map((doc) => doc.date)).toStrictEqual([
            new Date("2020-12-06"),
            new Date("2009-10-17"),
            new Date("2006-08-08"),
            new Date("1999-01-15"),
            new Date("1976-05-23"),
        ])
        expect(docs).toStrictEqual([
            { id: 1, date: new Date("2020-12-06") },
            { id: 4, date: new Date("2009-10-17") },
            { id: 5, date: new Date("2006-08-08") },
            { id: 2, date: new Date("1999-01-15") },
            { id: 3, date: new Date("1976-05-23") },
        ])
    })

    test("order by document id", async () => {
        // Given there is a collection of documents with ids;
        await db
            .collection("animals")
            .doc("22da618d")
            .set({ name: "aardvark" })
        await db
            .collection("animals")
            .doc("00a3382")
            .set({ name: "badger" })
        await db
            .collection("animals")
            .doc("11cbe6b5")
            .set({ name: "camel" })

        // When we order the collection by the document id;
        const result = await db
            .collection("animals")
            .orderBy(FieldPath.documentId())
            .get()

        // Then we should get the collection ordered by that field.
        const docs: Array<{
            id: number
            name: string
        }> = result.docs.map((doc) => doc.data() as any)

        expect(docs.map((doc) => doc.name)).not.toStrictEqual([
            "aardvark",
            "badger",
            "camel",
        ])
        expect(docs.map((doc) => doc.name)).toStrictEqual([
            "badger",
            "camel",
            "aardvark",
        ])
        expect(docs).toStrictEqual([
            { name: "badger" },
            { name: "camel" },
            { name: "aardvark" },
        ])
    })
})
