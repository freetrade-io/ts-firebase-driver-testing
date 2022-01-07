import _ from "lodash"
import { sleep } from "../util/sleep"
import { IDatabaseChangePerformanceStats } from "./ChangeObserver/DatabaseChangeObserver"

export interface IAsyncJobs {
    pushJob(job: Promise<any>): void
    pushJobs(jobs: Array<Promise<any>>): void
    jobsComplete(): Promise<void>

    shouldDebugJobsCompletePerformance: boolean
}

export class AsyncJobs implements IAsyncJobs {
    public shouldDebugJobsCompletePerformance = false
    private jobs: Array<Promise<IDatabaseChangePerformanceStats>> = []

    // To prevent trying to resolve 100s or possibly 1000s of promises at once
    // maxConcurrentJobs was added
    constructor(private maxConcurrentJobs: number = 20) {}

    pushJobs(jobs: Array<Promise<IDatabaseChangePerformanceStats>>): void {
        this.jobs = this.jobs.concat(jobs.map((job) => randomDelayJob(job)))
    }

    pushJob(job: Promise<IDatabaseChangePerformanceStats>): void {
        this.jobs.push(randomDelayJob(job))
    }

    async jobsComplete(): Promise<void> {
        // More jobs might be added by each job, so we can't just await Promise.all() here
        const changePerformanceStats: IDatabaseChangePerformanceStats[] = []
        while (this.jobs.length > 0) {
            this.randomiseJobsOrder()

            const itemsToResolve = this.jobs.slice(0, this.maxConcurrentJobs)

            const results = await Promise.all(itemsToResolve)
            changePerformanceStats.push(...results)

            // Remove the items we just processed from the front of the job queue
            this.jobs.splice(0, itemsToResolve.length)
        }

        this.logChangePerformanceStats(changePerformanceStats)
    }

    private logChangePerformanceStats(stats: IDatabaseChangePerformanceStats[]) {
        if (!this.shouldDebugJobsCompletePerformance) {
            return
        }

        const maxSlowToShow = 20
        const slowest = _.orderBy(stats, "durationMillis", ["desc"])
        const pathsWithoutIds = stats.map(stat => {
            const name = stat.path ?? stat.topicName ?? ""
            const components = name.split("/")
            return components.map((val, i) => i % 2 === 0 ? val : "*").join("/")
        })
        const uniqueCollections = new Set(pathsWithoutIds)
        console.log(`jobsComplete stats: there were ${stats.length} paths updated`)
        console.log(`jobsComplete stats: there were ${uniqueCollections.size} collections updated, the ones that were updated were:`)
        console.log(`jobsComplete stats: the collections that were updated were: ${JSON.stringify(Array.from(uniqueCollections), null, 2)}`)
        console.log(`jobsComplete stats: the ${maxSlowToShow} slowest paths to process were:`)
        console.table(slowest.slice(0, maxSlowToShow))
    }

    /**
     * Randomise job ordering so that tests cannot rely on ordering of async
     * events.
     */
    private randomiseJobsOrder(): void {
        this.jobs = _.shuffle(this.jobs)
    }
}

/**
 * Add a small random delay to a job so that individual job timings cannot be
 * relied on in tests.
 */
function randomDelayJob(job: Promise<any>): Promise<any> {
    return (async () => {
        await sleep(Math.random() * 10)
        return job
    })()
}
