import { enumeratePaths } from "../../src/util/enumeratePaths"

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
