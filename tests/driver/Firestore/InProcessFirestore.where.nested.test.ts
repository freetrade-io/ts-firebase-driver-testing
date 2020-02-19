import { InProcessFirestore } from "../../../src"

describe("InProcessFirestore nested path querying with where", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test("single nested where path", async () => {
        // Given a collection with nested paths;
        firestore.resetStorage({
            viewsThings: {
                thing1: {
                    createdAt: "2020-02-10T17:23:42.260Z",
                    view: {
                        status: "FOOBAR",
                    },
                },
                thing2: {
                    createdAt: "2020-02-10T17:23:43.260Z",
                    view: {
                        status: "NOT_FOOBAR",
                    },
                },
                thing3: {
                    createdAt: "2020-02-10T17:23:45.260Z",
                    view: {
                        status: "FOOBAR",
                    },
                },
            },
        })

        // When we select on a nested path;
        const snapshot = await firestore
            .collection("viewsThings")
            .where("view.status", "==", "FOOBAR")
            .get()

        // Then we should only get documents matching that nested path query.
        expect(snapshot.size).toEqual(2)
        expect(snapshot.docs[0].data()).toEqual({
            createdAt: "2020-02-10T17:23:42.260Z",
            view: {
                status: "FOOBAR",
            },
        })
        expect(snapshot.docs[1].data()).toEqual({
            createdAt: "2020-02-10T17:23:45.260Z",
            view: {
                status: "FOOBAR",
            },
        })
    })

    test("multiple nested where paths", async () => {
        // Given a collection with nested paths;
        firestore.resetStorage({
            viewsThings: {
                thing1: {
                    createdAt: "2020-02-10T17:23:42.260Z",
                    view: {
                        status: "FOOBAR",
                        features: {
                            excellent: true,
                        },
                    },
                },
                thing2: {
                    createdAt: "2020-02-10T17:23:43.260Z",
                    view: {
                        status: "NOT_FOOBAR",
                        features: {
                            excellent: true,
                        },
                    },
                },
                thing3: {
                    createdAt: "2020-02-10T17:23:45.260Z",
                    view: {
                        status: "FOOBAR",
                        features: {
                            excellent: false,
                        },
                    },
                },
            },
        })

        // When we select on multiple nested paths;
        const snapshot = await firestore
            .collection("viewsThings")
            .where("view.status", "==", "FOOBAR")
            .where("view.features.excellent", "==", true)
            .get()

        // Then we should only get documents matching that nested path query.
        expect(snapshot.size).toEqual(1)
        expect(snapshot.docs[0].data()).toEqual({
            createdAt: "2020-02-10T17:23:42.260Z",
            view: {
                status: "FOOBAR",
                features: {
                    excellent: true,
                },
            },
        })
    })

    test("multiple nested range paths", async () => {
        // Given a collection with nested paths;
        firestore.resetStorage({
            viewsThings: {
                thing1: {
                    view: {
                        status: "FOOBAR",
                        createdAt: "2020-02-10T17:00:00.000Z",
                        features: {
                            excellent: true,
                        },
                    },
                },
                thing2: {
                    view: {
                        status: "FOOBAR",
                        createdAt: "2020-02-10T18:00:00.00Z",
                        features: {
                            excellent: true,
                        },
                    },
                },
                thing3: {
                    view: {
                        status: "FOOBAR",
                        createdAt: "2020-02-10T19:00:00.00Z",
                        features: {
                            excellent: true,
                        },
                    },
                },
            },
        })

        // When we select on multiple nested paths with range filters;
        const snapshot = await firestore
            .collection("viewsThings")
            .where("view.status", "==", "FOOBAR")
            .where("view.features.excellent", "==", true)
            .where("view.createdAt", ">", "2020-02-10T17:30:00.000Z")
            .where("view.createdAt", "<", "2020-02-10T18:30:00.000Z")
            .get()

        // Then we should only get documents matching that nested path query.
        expect(snapshot.size).toEqual(1)
        expect(snapshot.docs[0].data()).toEqual({
            view: {
                status: "FOOBAR",
                createdAt: "2020-02-10T18:00:00.00Z",
                features: {
                    excellent: true,
                },
            },
        })
    })
})
