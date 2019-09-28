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
    changeEvents(change: IChange): IChange[]
}

abstract class ChangeFilter implements IChangeFilter {
    constructor(readonly path: string) {
        this.path = _.trim(this.path.trim(), "/")
    }

    abstract changeEvents(change: IChange): IChange[]

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

    protected matchPath(otherPath: string): boolean {
        const pathParts = this.path
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
        const otherPathParts = otherPath
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
        if (pathParts.length !== otherPathParts.length) {
            return false
        }
        for (const i in pathParts) {
            if (pathParts[i].match(/{[a-zA-Z0-9_-]+}/)) {
                continue
            }
            if (pathParts[i] === otherPathParts[i]) {
                continue
            }
            return false
        }
        return true
    }
}

export class CreatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IChange[] {
        const paths = this.changePaths(change)

        const created: IChange[] = []
        for (const afterPath of paths.afterPaths) {
            if (!this.matchPath(afterPath)) {
                // We're not interested in this path.
                continue
            }
            if (paths.beforePaths.includes(afterPath)) {
                // This is not a newly created path.
                continue
            }
            const afterAtPath = objectPath.get(
                change.after,
                afterPath.replace("/", "."),
            )
            if (afterAtPath === undefined || afterAtPath === null) {
                continue
            }
            created.push({
                before: undefined,
                after: afterAtPath,
            })
        }

        return created
    }
}

export class UpdatedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IChange[] {
        const paths = this.changePaths(change)

        const updated: IChange[] = []
        for (const afterPath of paths.afterPaths) {
            if (!this.matchPath(afterPath)) {
                // We're not interested in this path.
                continue
            }
            const afterAtPath = objectPath.get(
                change.before,
                afterPath.replace("/", "."),
            )
            if (afterAtPath === undefined || afterAtPath === null) {
                continue
            }
            const beforeAtPath = objectPath.get(
                change.before,
                afterPath.replace("/", "."),
            )
            if (beforeAtPath === undefined || beforeAtPath === null) {
                continue
            }
            if (afterAtPath !== beforeAtPath) {
                updated.push({ before: beforeAtPath, after: afterAtPath })
            }
        }

        return updated
    }
}

export class DeletedChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IChange[] {
        const paths = this.changePaths(change)

        const deleted: IChange[] = []
        for (const beforePath of paths.beforePaths) {
            if (!this.matchPath(beforePath)) {
                // We're not interested in this path.
                continue
            }
            if (paths.afterPaths.includes(beforePath)) {
                continue
            }
            const beforeAtPath = objectPath.get(
                change.before,
                beforePath.replace("/", "."),
            )
            deleted.push({ before: beforeAtPath, after: undefined })
        }

        return deleted
    }
}

export class WriteChangeFilter extends ChangeFilter {
    changeEvents(change: IChange): IChange[] {
        return [
            ...new CreatedChangeFilter(this.path).changeEvents(change),
            ...new UpdatedChangeFilter(this.path).changeEvents(change),
            ...new DeletedChangeFilter(this.path).changeEvents(change),
        ]
    }
}
