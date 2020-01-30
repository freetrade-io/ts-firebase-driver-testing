import { GRPCStatusCode } from "../../../src/driver/Common/GRPCStatusCode"
import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

/**
 * https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
 */
describe("In-process Firestore batched writes", () => {
    test("documentation example batch", async () => {
        // Given we have a in-process Firestore DB;
        const db = new InProcessFirestore()

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

        // When we get a new write batch;
        const batch = db.batch()

        // And set the value of 'NYC';
        const nycRef = db.collection("cities").doc("NYC")
        batch.set(nycRef, { name: "New York City" })

        // And update the population of 'SF';
        const sfRef = db.collection("cities").doc("SF")
        batch.update(sfRef, { population: 1000000 })

        // And delete the city 'LA';
        const laRef = db.collection("cities").doc("LA")
        batch.delete(laRef)

        // When we commit the batch;
        await batch.commit()

        // And get the data;
        const newYork = await db
            .collection("cities")
            .doc("NYC")
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
        expect(newYork.data()).toEqual({ name: "New York City" })

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

    test("cannot create existing document in a batch write", async () => {
        const db = new InProcessFirestore()
        // Given there is an existing document;
        const initial = await db
            .collection("animals")
            .doc("tiger")
            .set({ description: "stripey" })

        // When we create the same document;
        let error: Error | null = null
        try {
            const batch = db.batch()
            batch.create(db.doc("/animals/tiger"), {
                size: "large",
            })

            await batch.commit()
        } catch (err) {
            error = err
        }

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

    test("cannot reuse committed batch", async () => {
        // Given we have a write batch;
        const db = new InProcessFirestore()
        const batch = db.batch()

        // And we make a change in the batch;
        const docRef = db.collection("things").doc("thingA")
        batch.create(docRef, { foo: "bar" })

        // And we commit it;
        await batch.commit()

        // When we try to make another change in the same batch;
        let error: Error
        try {
            batch.update(docRef, { foo: "bar2" })
        } catch (err) {
            error = err
        }

        // Then an error should be thrown.
        // @ts-ignore
        expect(error).not.toBeUndefined()
        // @ts-ignore
        expect(error).toBeInstanceOf(Error)
    })
})
