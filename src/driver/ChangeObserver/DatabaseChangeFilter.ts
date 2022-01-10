import { flatten } from "flat"
import _ from "lodash"
import objectPath = require("object-path")
import { enumeratePaths } from "../../util/enumeratePaths"
import { JsonValue } from "../../util/json"
import { makeDelta } from "../../util/makeDelta"

/**
 * Firebase triggers get before/after, GCP cloud function triggers get
 * data/delta. Offering both here for convenience working between the
 * two setups.
 */
export interface IChange {
    before?: JsonValue | undefined
    after?: JsonValue | undefined
    data?: JsonValue | undefined
    delta?: JsonValue | undefined
}

export interface IParameterisedChange {
    parameters: IChangeParams
    change: IChange
    path: string
}

export interface IChangeParams {
    [key: string]: string
}

export interface IChangeFilter {
    readonly observedPath: string
    readonly observedPathRegex: RegExp

    changeEvents(change: IChange, dotPath?: string[]): IParameterisedChange[]
}

const normalisePath = (path: string) => _.trim(path.trim(), "/")

abstract class ChangeFilter implements IChangeFilter {
    readonly observedPathRegex: RegExp
    readonly positionMatched: Array<{
        pattern: string
        name?: string
        index?: number
    }>
    readonly namedPositionMatched: Array<{
        pattern: string
        name: string
        index: number
    }>

    constructor(readonly observedPath: string) {
        this.observedPath = normalisePath(observedPath)
        const pathParts = this.observedPath.split("/")
        let startIndex = 1
        this.positionMatched = pathParts.map((part) => {
            const matched = /^{(\S+)}$/.exec(part)
            if (matched) {
                return {
                    pattern: `([^/]+)`,
                    name: matched[1],
                    index: startIndex++,
                }
            }
            return { pattern: part }
        })
        this.namedPositionMatched = this.positionMatched.filter(
            (x) => x.index,
        ) as Array<{
            pattern: string
            name: string
            index: number
        }>

        this.observedPathRegex = new RegExp(
            `^${this.positionMatched.map((m) => m.pattern).join("/")}$`,
        )
    }

    abstract changeEvents(
        change: IChange,
        dotPath?: string[],
    ): IParameterisedChange[]

    protected changePaths(
        change: IChange,
        dotPath?: string[],
    ): { beforePaths: string[]; afterPaths: string[] } {
        let beforePaths: string[] = []
        const startingPath = (dotPath && dotPath.join("/")) || ""
        if (typeof change.before === "object") {
            beforePaths = [
                ...(dotPath
                    ? Object.keys(flatten(change.before)).map(
                          (path) =>
                              `${startingPath}/${path.split(".").join("/")}`,
                      )
                    : enumeratePaths(change.before)),
                startingPath,
            ]
        }
        let afterPaths: string[] = []
        if (typeof change.after === "object") {
            afterPaths = [
                ...(dotPath
                    ? Object.keys(flatten(change.after)).map(
                          (path) =>
                              `${startingPath}/${path.split(".").join("/")}`,
                      )
                    : enumeratePaths(change.after)),
                startingPath,
            ]
        }

        return {
            beforePaths: beforePaths.filter((x) => !x.includes("_meta")),
            afterPaths: afterPaths.filter((x) => !x.includes("_meta")),
        }
    }

    protected matchPath(
        otherPath: string,
    ): { match: boolean; parameters: { [key: string]: string } } {
        const parameters: { [key: string]: string } = {}
        const result = this.observedPathRegex.exec(otherPath)
        if (result) {
            this.namedPositionMatched.forEach((param) => {
                parameters[param.name] = result[param.index]
            })
            return {
                match: true,
                parameters,
            }
        }
        return {
            match: false,
            parameters: {},
        }
    }
}

export class FirestoreCreatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, _dotPath?: string[]): IParameterisedChange[] {
        const dotPath = _dotPath! // inProcessFirestore always provides dotPath
        // Firestore doesn't use dotPath change observers, so don't bother looking up nested paths
        const documentPath = dotPath.join("/")
        const isPreexistingDocument = typeof change.before === "object"
        const doesntExistAfter = typeof change.after !== "object"
        if (isPreexistingDocument || doesntExistAfter) {
            // This is not a newly created path.
            return []
        }

        const matchPath = this.matchPath(documentPath)
        if (!matchPath.match) {
            // We're not interested in this path.
            return []
        }

        return [
            {
                parameters: matchPath.parameters,
                change: {
                    before: undefined,
                    after: change.after,
                    data: undefined,
                    delta: change.after,
                },
                path: documentPath,
            },
        ]
    }
}

export class CreatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, dotPath?: string[]): IParameterisedChange[] {
        const paths = this.changePaths(change, dotPath)

        const created: IParameterisedChange[] = []
        for (const afterPath of paths.afterPaths) {
            const matchPath = this.matchPath(afterPath)
            if (!matchPath.match) {
                // We're not interested in this path.
                continue
            }
            if (paths.beforePaths.includes(afterPath)) {
                // This is not a newly created path.
                continue
            }
            const completePath = (dotPath || []).join("/")

            const afterAtPath = objectPath.get(
                change.after as object,
                dotPath
                    ? afterPath.slice(
                          // Remove the path from the start of the string
                          afterPath.indexOf(completePath) + completePath.length,
                      )
                    : afterPath.replace(/\//g, "."),
            )
            if (afterAtPath === undefined || afterAtPath === null) {
                continue
            }
            created.push({
                parameters: matchPath.parameters,
                change: {
                    before: undefined,
                    after: afterAtPath,
                    data: undefined,
                    delta: afterAtPath,
                },
                path: afterPath,
            })
        }

        return created
    }
}

export class UpdatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, dotPath?: string[]): IParameterisedChange[] {
        const paths = this.changePaths(change, dotPath)

        const updated: IParameterisedChange[] = []
        for (const afterPath of paths.afterPaths) {
            const matchPath = this.matchPath(afterPath)
            if (!matchPath.match) {
                // We're not interested in this path.
                continue
            }
            const afterAtPath = objectPath.get(
                change.after as object,
                dotPath
                    ? afterPath
                          .replace(new RegExp("^" + dotPath.join("/")), "")
                          .replace(/\//g, ".")
                    : afterPath.replace(/\//g, "."),
            )
            if (afterAtPath === undefined || afterAtPath === null) {
                continue
            }
            const beforeAtPath = objectPath.get(
                change.before as object,
                dotPath
                    ? afterPath
                          .replace(new RegExp("^" + dotPath.join("/")), "")
                          .replace(/\//g, ".")
                    : afterPath.replace(/\//g, "."),
            )
            if (beforeAtPath === undefined || beforeAtPath === null) {
                continue
            }
            if (!_.isEqual(afterAtPath, beforeAtPath)) {
                updated.push({
                    parameters: matchPath.parameters,
                    change: {
                        before: beforeAtPath,
                        after: afterAtPath,
                        data: beforeAtPath,
                        delta: makeDelta(beforeAtPath, afterAtPath),
                    },
                    path: afterPath,
                })
            }
        }

        return updated
    }
}

export class FirestoreUpdatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, _dotPath?: string[]): IParameterisedChange[] {
        const dotPath = _dotPath! // inProcessFirestore always provides dotPath
        // Firestore doesn't use dotPath change observers, so don't bother looking up nested paths
        const documentPath = dotPath.join("/")
        const doesntExistBefore = typeof change.before !== "object"
        const doesntExistAfter = typeof change.after !== "object"

        if (doesntExistBefore || doesntExistAfter) {
            // This is not an updated path, it's been created/deleted so ignore it
            return []
        }

        const matchPath = this.matchPath(documentPath)
        if (!matchPath.match) {
            // We're not interested in this path.
            return []
        }

        if (!_.isEqual(change.after, change.before)) {
            return [
                {
                    parameters: matchPath.parameters,
                    change: {
                        before: change.before,
                        after: change.after,
                        data: change.before,
                        delta: makeDelta(change.before!, change.after!),
                    },
                    path: documentPath,
                },
            ]
        }

        return []
    }
}

export class DeletedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, dotPath?: string[]): IParameterisedChange[] {
        const paths = this.changePaths(change, dotPath)

        const deleted: IParameterisedChange[] = []
        for (const beforePath of paths.beforePaths) {
            const matchPath = this.matchPath(beforePath)
            if (!matchPath.match) {
                // We're not interested in this path.
                continue
            }
            if (paths.afterPaths.includes(beforePath)) {
                const afterAtPath = objectPath.get(
                    change.after as { [key: string]: JsonValue },
                    dotPath
                        ? beforePath
                              .replace(new RegExp("^" + dotPath.join("/")), "")
                              .replace(/\//g, ".")
                        : beforePath.replace(/\//g, "."),
                )
                if (afterAtPath !== undefined && afterAtPath !== null) {
                    continue
                }
            }
            const beforeAtPath = objectPath.get(
                change.before as { [key: string]: JsonValue },
                dotPath
                    ? beforePath
                          .replace(new RegExp("^" + dotPath.join("/")), "")
                          .replace(/\//g, ".")
                    : beforePath.replace(/\//g, "."),
            )
            deleted.push({
                parameters: matchPath.parameters,
                change: {
                    before: beforeAtPath,
                    after: undefined,
                    data: beforeAtPath,
                    delta: undefined,
                },
                path: beforePath,
            })
        }

        return deleted
    }
}

export class FirestoreDeletedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, _dotPath?: string[]): IParameterisedChange[] {
        const dotPath = _dotPath! // inProcessFirestore always provides dotPath
        // Firestore doesn't use dotPath change observers, so don't bother looking up nested paths
        const documentPath = dotPath.join("/")
        const doesntExistBefore = typeof change.before !== "object"
        const existsAfter = typeof change.after === "object"
        if (doesntExistBefore || existsAfter) {
            // This is not a deleted path.
            return []
        }

        const matchPath = this.matchPath(documentPath)
        if (!matchPath.match) {
            // We're not interested in this path.
            return []
        }

        return [
            {
                parameters: matchPath.parameters,
                change: {
                    before: change.before,
                    after: undefined,
                    data: change.before,
                    delta: undefined,
                },
                path: documentPath,
            },
        ]
    }
}

export class WrittenChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, dotPath?: string[]): IParameterisedChange[] {
        return [
            ...new CreatedChangeFilter(this.observedPath).changeEvents(
                change,
                dotPath,
            ),
            ...new UpdatedChangeFilter(this.observedPath).changeEvents(
                change,
                dotPath,
            ),
            ...new DeletedChangeFilter(this.observedPath).changeEvents(
                change,
                dotPath,
            ),
        ]
    }
}

export class FirestoreWrittenChangeFilter extends ChangeFilter {
    changeEvents(change: IChange, dotPath?: string[]): IParameterisedChange[] {
        return [
            ...new FirestoreCreatedChangeFilter(this.observedPath).changeEvents(
                change,
                dotPath,
            ),
            ...new FirestoreUpdatedChangeFilter(this.observedPath).changeEvents(
                change,
                dotPath,
            ),
            ...new FirestoreDeletedChangeFilter(this.observedPath).changeEvents(
                change,
                dotPath,
            ),
        ]
    }
}
