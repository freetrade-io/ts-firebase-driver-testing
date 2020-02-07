import _ from "lodash"
import objectPath = require("object-path")
import { enumeratePaths } from "../../util/enumeratePaths"
import { stripMeta } from "../../util/stripMeta"

export interface IChange {
    before: any
    after: any
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
    changeEvents(change: IChange): IParameterisedChange[]
}

abstract class ChangeFilter implements IChangeFilter {
    constructor(readonly observedPath: string) {
        this.observedPath = _.trim(this.observedPath.trim(), "/")
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
        const pathParts = this.observedPath
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
            .filter((p) => p !== "_meta")
        const otherPathParts = otherPath
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
            .filter((p) => p !== "_meta")
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
                path: afterPath,
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
                    path: afterPath,
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
                path: beforePath,
            })
        }

        return deleted
    }
}

export class WrittenChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IParameterisedChange[] {
        return [
            ...new CreatedChangeFilter(this.observedPath).changeEvents(change),
            ...new UpdatedChangeFilter(this.observedPath).changeEvents(change),
            ...new DeletedChangeFilter(this.observedPath).changeEvents(change),
        ]
    }
}
