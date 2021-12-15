import { enumeratePaths, getChangePaths } from "../../src/util/enumeratePaths"

describe("enumerating object paths", () => {
    test.each([
        [undefined, []],
        ["foo", []],
        [1, []],
        [true, []],
        [{}, []],
        [{ foo: "bar" }, ["foo"]],
        [{ foo: "yes", bar: 1, baz: true }, ["foo", "bar", "baz"]],
        [{ foo: "yes", bar: { thing: "yes" } }, ["foo", "bar", "bar/thing"]],
        [
            { foo: { bar: { baz: { thing: "yes" } } } },
            ["foo", "foo/bar", "foo/bar/baz", "foo/bar/baz/thing"],
        ],
        [
            {
                animals: {
                    lion: { sound: "roar" },
                    zebra: { appearance: "stripes" },
                    elephant: {
                        size: "large",
                        features: { trunk: "yes", tusks: "yes", wings: "no" },
                    },
                },
            },
            [
                "animals",
                "animals/lion",
                "animals/zebra",
                "animals/elephant",
                "animals/lion/sound",
                "animals/zebra/appearance",
                "animals/elephant/size",
                "animals/elephant/features",
                "animals/elephant/features/trunk",
                "animals/elephant/features/tusks",
                "animals/elephant/features/wings",
            ],
        ],
    ] as Array<[any, string[]]>)(
        "enumeratePaths",
        (value: any, expectedPaths: string[]) => {
            // Given a value;

            // When we enumerate its paths;
            const paths = enumeratePaths(value)

            // Then we should get the expected enumeration of paths.
            expect(paths).toEqual(expectedPaths)
        },
    )
})

describe("getChangePaths", () => {
    test("it processes a simple object", () => {
        expect(getChangePaths({ test: "me" })).toEqual(["test"])
    })

    test("it processes a nested object", () => {
        expect(getChangePaths({ test: { this: { nest: "please" } } })).toEqual([
            "test",
            "test/this",
            "test/this/nest",
        ])
    })

    test("it processes an array", () => {
        expect(getChangePaths([1, 2, 3])).toEqual(["0", "1", "2"])
    })

    test("it processes a nested array", () => {
        expect(
            getChangePaths({
                cast: [
                    {
                        name: "Don",
                        seasons: [1, 2, 3],
                    },
                    {
                        name: "Roger",
                        seasons: [2, 3, 4],
                    },
                ],
            }),
        ).toEqual([
            "cast",
            "cast/0",
            "cast/1",
            "cast/0/name",
            "cast/0/seasons",
            "cast/1/name",
            "cast/1/seasons",
            "cast/0/seasons/0",
            "cast/0/seasons/1",
            "cast/0/seasons/2",
            "cast/1/seasons/0",
            "cast/1/seasons/1",
            "cast/1/seasons/2",
        ])
    })
})
