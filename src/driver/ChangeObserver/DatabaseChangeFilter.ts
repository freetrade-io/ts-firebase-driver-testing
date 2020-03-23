import { flatten } from "flat"
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
        this.positionMatched = pathParts.map((part, index) => {
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
        const otherPathParts = otherPath
            .split("/")
            .map((p) => p.trim())
            .filter((p) => p.length)
            .filter((p) => p !== "_meta")

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
            const afterAtPath = objectPath.get(
                change.after,
                dotPath
                    ? afterPath
                          .replace(new RegExp("^" + dotPath.join("/")), "")
                          .replace(/\//g, ".")
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
                change.after,
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
                change.before,
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
                    change: { before: beforeAtPath, after: afterAtPath },
                    path: afterPath,
                })
            }
        }

        return updated
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
                    change.after,
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
                change.before,
                dotPath
                    ? beforePath
                          .replace(new RegExp("^" + dotPath.join("/")), "")
                          .replace(/\//g, ".")
                    : beforePath.replace(/\//g, "."),
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
