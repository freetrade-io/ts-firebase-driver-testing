import {
    CreatedChangeFilter,
    IChange,
    IParameterisedChange,
} from "../../../../src"

describe("CreatedChangeFilter", () => {
    test.each([
        ["", {}, []],
        ["/foo", { after: {} }, []],
        [
            "/foo",
            { after: { foo: "bar" } },
            [{ parameters: {}, change: { after: "bar" } }],
        ],
        [
            "/foo",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: {}, change: { after: { bar: "baz" } } }],
        ],
        [
            "/foo",
            { before: {}, after: { foo: { bar: "baz" } } },
            [{ parameters: {}, change: { after: { bar: "baz" } } }],
        ],
        [
            "/foo",
            {
                before: { hello: "yes" },
                after: { hello: "yes", foo: { bar: "baz" } },
            },
            [{ parameters: {}, change: { after: { bar: "baz" } } }],
        ],
        [
            "/foo/bar",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: {}, change: { after: "baz" } }],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: { id: "foo" }, change: { after: "baz" } }],
        ],
        [
            "/{id}/{key}",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo", key: "bar" },
                    change: { after: "baz" },
                },
            ],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: { id: "foo" }, change: { after: "baz" } }],
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
                    change: { before: undefined, after: "very stripey" },
                },
                {
                    parameters: {
                        animalName: "tiger",
                        featureName: "swimming",
                    },
                    change: { before: undefined, after: "not swimming" },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "stripey",
                    },
                    change: { before: undefined, after: "not stripey" },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: { before: undefined, after: "much swimming" },
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
})
