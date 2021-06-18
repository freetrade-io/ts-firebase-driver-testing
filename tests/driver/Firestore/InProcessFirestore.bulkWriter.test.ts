import { InProcessFirestore } from "../../../src"
import { GRPCStatusCode } from "../../../src/driver/Common/GRPCStatusCode"
import { FirestoreError } from "../../../src/driver/Firestore/FirestoreError"

describe('In-process Firestore BulkWriter', () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })
    test('delivers correct functionality', async () =>{
        // Given we have a in-process Firestore DB;
        // And there is some initial data;
        await db
            .collection("cities")
            .doc("SF")
            .set({
                name: "San Francisco",
                state: "CA",
                country: "USA",
                capital: false,
                population: 860000,
            })
        await db
            .collection("cities")
            .doc("LA")
            .set({
                name: "Los Angeles",
                state: "LA",
                country: "USA",
                capital: false,
                population: 4000000,
            })

        // When we get a new BulkWriter;
        const bulkWriter = db.bulkWriter()

        // And set the value of 'NYC';
        const nycRef = db.collection("cities").doc("NYC")
        bulkWriter.set(nycRef, { name: "New York City" })

        // And update the population of 'SF';
        const sfRef = db.collection("cities").doc("SF")
        bulkWriter.update(sfRef, { population: 1000000 })

        // Add downtown district to SF
        const nycDistrictsRef = db
            .collection("cities")
            .doc("NYC")
            .collection("districts")
            .doc("downtown")

        bulkWriter.set(nycDistrictsRef, { density: 200 })

        // Add more details changed during batch
        bulkWriter.set(nycRef, { name: "New York City", population: 4000000 })

        // And delete the city 'LA';
        const laRef = db.collection("cities").doc("LA")
        bulkWriter.delete(laRef)

        // When we flush the BulkWriter;
        await bulkWriter.flush()

        // And get the data;
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

        const sanFrancisco = await db
            .collection("cities")
            .doc("SF")
            .get()
        const losAngeles = await db
            .collection("cities")
            .doc("LA")
            .get()

        // Then the data should have been updated correctly.
        expect(newYork.exists).toBeTruthy()
        expect(newYork.data()).toEqual({
            name: "New York City",
            population: 4000000,
        })

        expect(newYorkDistricts.exists).toBeTruthy()
        expect(newYorkDistricts.data()).toEqual({ density: 200 })

        expect(sanFrancisco.exists).toBeTruthy()
        expect(sanFrancisco.data()).toEqual({
            name: "San Francisco",
            state: "CA",
            country: "USA",
            capital: false,
            population: 1000000,
        })

        expect(losAngeles.exists).toBeFalsy()
        expect(losAngeles.data()).toEqual({})
    })

    test("cannot create existing document in a bulk write", async () => {
        // Given there is an existing document;
        await db
            .collection("animals")
            .doc("tiger")
            .set({ description: "stripey" })

        // When we create the same document;
        let error: Error | null = null
        const bulkWriter = db.bulkWriter()
        
        bulkWriter.create(db.doc("/animals/tiger"), {
            size: "large",
        }).catch((createError) => {
            error = createError
        })

        await bulkWriter.flush()
 
        // Then the write should fail;
        expect(error).isFirestoreErrorWithCode(
            GRPCStatusCode.ALREADY_EXISTS,
            new RegExp("animals/tiger"),
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

    test("throws if calls made after close()", async () => {
        // Given we have a write batch;
        const bulkWriter = db.bulkWriter()

        await bulkWriter.close()

        await expect(bulkWriter.flush()).rejects.toThrowError()
    })
})