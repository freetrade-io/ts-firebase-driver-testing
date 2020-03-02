import { InProcessFirestore } from "../../../src"

describe("filtering unprocessed queue messages in Firestore", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test("empty queue collection", async () => {
        // Given an empty message queue collection in Firestore;
        firestore.resetStorage({
            "queues-foobar": {},
        })

        // When we query for unprocessed queue messages;
        const snapshot = await firestore
            .collection("queues-foobar")
            .orderBy("attributes.created", "asc")
            .where("processed", "==", false)
            .limit(450)
            .get()

        // Then we should get an empty result.
        expect(snapshot.docs).toHaveLength(0)
        expect(snapshot.size).toBe(0)
    })

    test("all unprocessed queue messages", async () => {
        // Given a message queue collection with 3 unprocessed messages;
        firestore.resetStorage({
            "queues-foobar": {
                ac1b7fcf: {
                    attributes: { created: "2020-02-21T12:39:17.099Z" },
                    processed: false,
                },
                f2c765d2: {
                    attributes: { created: "2020-02-21T12:38:49.816Z" },
                    processed: false,
                },
                f0a8a5bf: {
                    attributes: { created: "2020-02-21T12:39:25.606Z" },
                    processed: false,
                },
            },
        })

        // When we query for unprocessed queue messages;
        const snapshot = await firestore
            .collection("queues-foobar")
            .orderBy("attributes.created", "asc")
            .where("processed", "==", false)
            .limit(450)
            .get()

        // Then we should get the 3 unprocessed messages.
        expect(snapshot.docs).toHaveLength(3)
        expect(snapshot.size).toBe(3)
        expect(snapshot.docs[0].data()).toEqual({
            attributes: { created: "2020-02-21T12:38:49.816Z" },
            processed: false,
        })
        expect(snapshot.docs[1].data()).toEqual({
            attributes: { created: "2020-02-21T12:39:17.099Z" },
            processed: false,
        })
        expect(snapshot.docs[2].data()).toEqual({
            attributes: { created: "2020-02-21T12:39:25.606Z" },
            processed: false,
        })
    })

    test("some unprocessed queue messages", async () => {
        // Given a queue collection with 2 unprocessed and 1 processed messages;
        firestore.resetStorage({
            "queues-foobar": {
                ac1b7fcf: {
                    attributes: { created: "2020-02-21T12:39:17.099Z" },
                    processed: false,
                },
                f2c765d2: {
                    attributes: { created: "2020-02-21T12:38:49.816Z" },
                    processed: true,
                },
                f0a8a5bf: {
                    attributes: { created: "2020-02-21T12:39:25.606Z" },
                    processed: false,
                },
            },
        })

        // When we query for unprocessed queue messages;
        const snapshot = await firestore
            .collection("queues-foobar")
            .orderBy("attributes.created", "asc")
            .where("processed", "==", false)
            .limit(450)
            .get()

        // Then we should get the 2 unprocessed messages.
        expect(snapshot.docs).toHaveLength(2)
        expect(snapshot.size).toBe(2)
        expect(snapshot.docs[0].data()).toEqual({
            attributes: { created: "2020-02-21T12:39:17.099Z" },
            processed: false,
        })
        expect(snapshot.docs[1].data()).toEqual({
            attributes: { created: "2020-02-21T12:39:25.606Z" },
            processed: false,
        })
    })

    test("all processed queue messages", async () => {
        // Given a queue collection with 3 processed messages;
        firestore.resetStorage({
            "queues-foobar": {
                ac1b7fcf: {
                    attributes: { created: "2020-02-21T12:39:17.099Z" },
                    processed: true,
                },
                f2c765d2: {
                    attributes: { created: "2020-02-21T12:38:49.816Z" },
                    processed: true,
                },
                f0a8a5bf: {
                    attributes: { created: "2020-02-21T12:39:25.606Z" },
                    processed: true,
                },
            },
        })

        // When we query for unprocessed queue messages;
        const snapshot = await firestore
            .collection("queues-foobar")
            .orderBy("attributes.created", "asc")
            .where("processed", "==", false)
            .limit(450)
            .get()

        // Then we should get an empty result.
        expect(snapshot.docs).toHaveLength(0)
        expect(snapshot.size).toBe(0)
    })
})