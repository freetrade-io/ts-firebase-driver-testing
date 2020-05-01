import { hasSubMeta } from "../../src/util/stripMeta"

describe("hasSubMeta", () => {
    test.each([true, false, null, "string", 1000])(
        "handles $s type",
        (input) => {
            expect(hasSubMeta(input)).toEqual(false)
        },
    )
})
