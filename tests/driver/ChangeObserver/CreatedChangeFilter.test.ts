import {
    CreatedChangeFilter,
    IChange,
    IParameterisedChange,
} from "../../../src/driver/ChangeObserver/DatabaseChangeFilter"

describe("CreatedChangeFilter", () => {
    test.each([
        ["", {}, []],
        ["/foo", { after: {} }, []],
        [
            "/foo",
            { after: { foo: "bar" } },
            [
                {
                    parameters: {},
                    change: { after: "bar", delta: "bar" },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { after: { bar: "baz" }, delta: { bar: "baz" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo",
            { before: {}, after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { after: { bar: "baz" }, delta: { bar: "baz" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo",
            {
                before: { hello: "yes" },
                after: { hello: "yes", foo: { bar: "baz" } },
            },
            [
                {
                    parameters: {},
                    change: { after: { bar: "baz" }, delta: { bar: "baz" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo/bar",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo" },
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/{id}/{key}",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo", key: "bar" },
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo" },
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/animals/{animalName}/features/{featureName}",
            {
                before: {
                    animals: {},
                },
                after: {
                    animals: {
                        tiger: {
                            features: {
                                stripey: "very stripey",
                                swimming: "not swimming",
                            },
                        },
                        dolphin: {
                            features: {
                                stripey: "not stripey",
                                swimming: "much swimming",
                            },
                        },
                    },
                },
            },
            [
                {
                    parameters: { animalName: "tiger", featureName: "stripey" },
                    change: {
                        before: undefined,
                        after: "very stripey",
                        delta: "very stripey",
                    },
                    path: "animals/tiger/features/stripey",
                },
                {
                    parameters: {
                        animalName: "tiger",
                        featureName: "swimming",
                    },
                    change: {
                        before: undefined,
                        after: "not swimming",
                        delta: "not swimming",
                    },
                    path: "animals/tiger/features/swimming",
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "stripey",
                    },
                    change: {
                        before: undefined,
                        after: "not stripey",
                        delta: "not stripey",
                    },
                    path: "animals/dolphin/features/stripey",
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: {
                        before: undefined,
                        after: "much swimming",
                        delta: "much swimming",
                    },
                    path: "animals/dolphin/features/swimming",
                },
            ],
        ],
    ] as Array<[string, IChange, IParameterisedChange[]]>)(
        "changeEvents cases",
        (
            observedPath: string,
            change: IChange,
            expectedChangeEvents: IParameterisedChange[],
        ) => {
            // Given a Created change filter for a path;
            const filter = new CreatedChangeFilter(observedPath)

            // When we observe for created events from a change;
            const createdChangeEvents = filter.changeEvents(change)

            // Then we should get the expected Created change events.
            expect(createdChangeEvents).toEqual(expectedChangeEvents)
        },
    )

    test("firestore created change event with regex special characters", () => {
        const filter = new CreatedChangeFilter("cars/{carName}")

        // When we observe for created events from a change;
        const createdChangeEvents = filter.changeEvents(
            {
                after: { name: "model t" },
                delta: { name: "model t" },
            },
            ["cars", "car-with-unusual-suffix+0000"],
        )

        // Then we should get the expected Created change events.
        expect(createdChangeEvents).toEqual([
            {
                parameters: {
                    carName: "car-with-unusual-suffix+0000",
                },
                change: {
                    after: { name: "model t" },
                    delta: { name: "model t" },
                },
                path: "cars/car-with-unusual-suffix+0000",
            },
        ])
    })
})
