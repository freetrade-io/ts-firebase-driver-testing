import _ from "lodash"
import objectPath = require("object-path")
import { enumeratePaths } from "../../util/enumeratePaths"

export interface IChange {
    before: any
    after: any
}

// TODO: Return this from filters instead of IChange
export interface IParameterisedChange {
    parameters: { [key: string]: string }
    change: IChange
}

export interface IChangeFilter {
    readonly path: string
    changeEvents(change: IChange): IParameterisedChange[]
}

abstract class ChangeFilter implements IChangeFilter {
    constructor(readonly path: string) {
        this.path = _.trim(this.path.trim(), "/")
    }

    abstract changeEvents(change: IChange): IParameterisedChange[]

    protected changePaths(
        change: IChange,
    ): { beforePaths: string[]; afterPaths: string[] } {
        let beforePaths: string[] = []
        if (typeof change.before === "object") {
            beforePaths = enumeratePaths(change.before)
        }
        let afterPaths: string[] = []
        if (typeof change.after === "object") {
            afterPaths = enumeratePaths(change.after)
        }

        return { beforePaths, afterPaths }
    }

    protected matchPath(
        otherPath: string,
    ): { match: boolean; parameters: { [key: string]: string } } {
        const pathParts = this.path
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
        const otherPathParts = otherPath
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
        if (pathParts.length !== otherPathParts.length) {
            return {
                match: false,
                parameters: {},
            }
        }
        const parameters: { [key: string]: string } = {}
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i].match(/{[a-zA-Z0-9_-]+}/)) {
                parameters[_.trim(pathParts[i], "{}")] = otherPathParts[i]
                continue
            }
            if (pathParts[i] === otherPathParts[i]) {
                continue
            }
            return {
                match: false,
                parameters: {},
            }
        }
        return {
            match: true,
            parameters,
        }
    }
}

export class CreatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IParameterisedChange[] {
        const paths = this.changePaths(change)

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
            const afterAtPath = objectPath.get(
                change.after,
                afterPath.replace(/\//g, "."),
            )
            if (afterAtPath === undefined || afterAtPath === null) {
                continue
            }
            created.push({
                parameters: matchPath.parameters,
                change: {
                    before: undefined,
                    after: afterAtPath,
                },
            })
        }

        return created
    }
}

export class UpdatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IParameterisedChange[] {
        const paths = this.changePaths(change)

        const updated: IParameterisedChange[] = []
        for (const afterPath of paths.afterPaths) {
            const matchPath = this.matchPath(afterPath)
            if (!matchPath.match) {
                // We're not interested in this path.
                continue
            }
            const afterAtPath = objectPath.get(
                change.after,
                afterPath.replace(/\//g, "."),
            )
            if (afterAtPath === undefined || afterAtPath === null) {
                continue
            }
            const beforeAtPath = objectPath.get(
                change.before,
                afterPath.replace(/\//g, "."),
            )
            if (beforeAtPath === undefined || beforeAtPath === null) {
                continue
            }
            if (!_.isEqual(afterAtPath, beforeAtPath)) {
                updated.push({
                    parameters: matchPath.parameters,
                    change: { before: beforeAtPath, after: afterAtPath },
                })
            }
        }

        return updated
    }
}

export class DeletedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IParameterisedChange[] {
        const paths = this.changePaths(change)

        const deleted: IParameterisedChange[] = []
        for (const beforePath of paths.beforePaths) {
            const matchPath = this.matchPath(beforePath)
            if (!matchPath.match) {
                // We're not interested in this path.
                continue
            }
            if (paths.afterPaths.includes(beforePath)) {
                const afterAtPath = objectPath.get(
                    change.after,
                    beforePath.replace(/\//g, "."),
                )
                if (afterAtPath !== undefined && afterAtPath !== null) {
                    continue
                }
            }
            const beforeAtPath = objectPath.get(
                change.before,
                beforePath.replace(/\//g, "."),
            )
            deleted.push({
                parameters: matchPath.parameters,
                change: { before: beforeAtPath, after: undefined },
            })
        }

        return deleted
    }
}

export class WriteChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IParameterisedChange[] {
        return [
            ...new CreatedChangeFilter(this.path).changeEvents(change),
            ...new UpdatedChangeFilter(this.path).changeEvents(change),
            ...new DeletedChangeFilter(this.path).changeEvents(change),
        ]
    }
}
