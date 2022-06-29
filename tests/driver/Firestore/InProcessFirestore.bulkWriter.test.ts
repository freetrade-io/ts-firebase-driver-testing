import { InProcessFirestore } from "../../../src"
import { GRPCStatusCode } from "../../../src/driver/Common/GRPCStatusCode"
import { FirestoreError } from "../../../src/driver/Firestore/FirestoreError"

describe("In-process Firestore BulkWriter", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("set operation updates the doc and underlying collections correctly", async () => {
        // When we get a new BulkWriter
        const bulkWriter = db.bulkWriter()

        // And set the value of NYC doc
        const nycRef = db.collection("cities").doc("NYC")
        bulkWriter.set(nycRef, { name: "New York City" })

        // Add downtown district to NYC doc
        const nycDistrictsRef = db
            .collection("cities")
            .doc("NYC")
            .collection("districts")
            .doc("downtown")

        bulkWriter.set(nycDistrictsRef, { density: 200 })

        // Add more set changes
        bulkWriter.set(nycRef, { name: "New York City", population: 4000000 })

        // When we flush the BulkWriter
        await bulkWriter.flush()

        // And get the NYC data
        const newYork = await db
            .collection("cities")
            .doc("NYC")
            .get()
        const newYorkDistricts = await db
            .collection("cities")
            .doc("NYC")
            .collection("districts")
            .doc("downtown")
            .get()

        // Then the data should have been updated correctly.
        expect(newYork.exists).toBeTruthy()
        expect(newYork.data()).toEqual({
            name: "New York City",
            population: 4000000,
        })

        expect(newYorkDistricts.exists).toBeTruthy()
        expect(newYorkDistricts.data()).toEqual({ density: 200 })
    })

    test("set operation with merge flag replaces correct doc fields", async () => {
        // given some doc with data
        const docRef = db.collection("cities").doc("SF")

        await docRef.set({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
        })

        // when we get a new BulkWriter
        const bulkWriter = db.bulkWriter()

        // and we set a field with the merge flag
        bulkWriter.set(docRef, { population: 1000000 }, { merge: true })

        // when we flush
        await bulkWriter.flush()

        // we expect the doc to be updated
        const doc = await docRef.get()
        expect(doc.data()).toEqual({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 1000000,
        })
    })

    test("update operation updates the doc fields correctly", async () => {
        // given an existing doc
        const docRef = db.collection("cities").doc("SF")

        await docRef.set({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
        })

        // When we get a new BulkWriter
        const bulkWriter = db.bulkWriter()

        // And update the population of SF
        bulkWriter.update(docRef, { population: 1000000 })

        // when we flush
        await bulkWriter.flush()

        // we expect the doc to be updated
        const doc = await docRef.get()
        expect(doc.data()).toEqual({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 1000000,
        })
    })

    test("create operation creates the doc correctly", async () => {
        // When we get a new BulkWriter
        const bulkWriter = db.bulkWriter()

        // And create a doc with data
        const docRef = db.collection("cities").doc("SF")

        bulkWriter.create(docRef, {
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
        })

        // when we flush
        await bulkWriter.flush()

        // we expect the doc to be created
        const doc = await docRef.get()
        expect(doc.data()).toEqual({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 860000,
        })
    })

    test("delete operation deletes the doc correctly", async () => {
        // given an existing doc
        const docRef = db.collection("cities").doc("LA")

        await docRef.set({
            name: "Los Angeles",
            state: "LA",
            country: "USA",
            capital: false,
            population: 4000000,
        })

        // When we get a new BulkWriter
        const bulkWriter = db.bulkWriter()

        // And delete the LA doc
        bulkWriter.delete(docRef)

        // when we flush
        await bulkWriter.flush()

        // we expect the doc to have been deleted
        const doc = await docRef.get()
        expect(doc.exists).toBeFalsy()
        expect(doc.data()).toEqual({})
    })
    test("cannot create existing document in a bulk write", async () => {
        // Given there is an existing document
        await db
            .collection("animals")
            .doc("tiger")
            .set({ description: "stripey" })

        // When we create the same document
        let error: Error | null = null
        const bulkWriter = db.bulkWriter()

        bulkWriter
            .create(db.doc("/animals/tiger"), {
                size: "large",
            })
            .catch((createError) => {
                error = createError
            })

        await bulkWriter.flush()

        // Then the write should fail
        expect(error).isFirestoreErrorWithCode(
            GRPCStatusCode.ALREADY_EXISTS,
            new RegExp("/documents/animals/tiger"),
        )

        // And the document should not be changed.
        const snapshot = await db
            .collection("animals")
            .doc("tiger")
            .get()
        expect(snapshot.exists).toBeTruthy()
        expect(snapshot.data()).toEqual({ description: "stripey" })
    })

    test("throws if an undefined field is written", async () => {
        // Given we have a write writer
        const bulkWriter = db.bulkWriter()

        let bulkWriterCreateError = null
        // And we make a change in the batch
        const docRef = db.collection("things").doc("thingA")
        bulkWriter
            .create(docRef, { foo: "bar", bar: undefined })
            .catch((createError) => {
                bulkWriterCreateError = createError
            })

        // when we flush the bulk writer
        await bulkWriter.flush()

        // we expect the create op to have thrown an error
        expect(bulkWriterCreateError).toBeInstanceOf(FirestoreError)

        // And the db should be empty
        expect(db.storage).toEqual({})
    })

    test("only throws for single operation and not on flush", async () => {
        // Given we have a bulk writer
        const bulkWriter = db.bulkWriter()

        let bulkWriterCreateError = null

        // And we make a bulk write with an undefined field
        const docRef = db.collection("things").doc("thingA")
        bulkWriter
            .create(docRef, { foo: "bar", bar: undefined })
            .catch((createError) => {
                bulkWriterCreateError = createError
            })

        // And we make a bulk write with valid fields
        const validDocRef = db.collection("things").doc("thingB")
        bulkWriter.create(validDocRef, { foo: "bar", bar: "foo" })

        // When we flush the bulk writer
        await bulkWriter.flush()

        // We expect the invalid create op to have thrown an error
        expect(bulkWriterCreateError).toBeInstanceOf(FirestoreError)

        // And the valid create op to have created a doc
        const doc = await validDocRef.get()
        expect(doc.data()).toEqual({ foo: "bar", bar: "foo" })
    })

    test("throws if calls made after close()", async () => {
        // Given we have a write batch
        const bulkWriter = db.bulkWriter()

        await bulkWriter.close()

        await expect(bulkWriter.flush()).rejects.toThrowError()
    })
})
