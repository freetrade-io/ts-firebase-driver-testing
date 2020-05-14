export type JsonValue =
    | number
    | boolean
    | string
    | JsonValue[]
    | { [key: string]: JsonValue }
