import _ from "lodash"
import pLimit from "p-limit"
import { sleep } from "../util/sleep"

export interface IAsyncJobs {
    pushJob(job: Promise<any>): void

    pushJobs(jobs: Array<Promise<any>>): void

    jobsComplete(): Promise<void>
}

export class AsyncJobs implements IAsyncJobs {
    private jobs: Array<Promise<any>> = []

    // To prevent trying to resolve 100s or possibly 1000s of promises at once
    // maxConcurrentJobs was added
    constructor(private maxConcurrentJobs: number = 20) {
    }

    pushJobs(jobs: Array<Promise<any>>): void {
        this.jobs = this.jobs.concat(jobs.map((job) => randomDelayJob(job)))
    }

    pushJob(job: Promise<any>): void {
        this.jobs.push(randomDelayJob(job))
    }

    async jobsComplete(): Promise<void> {
        // More jobs might be added by each job, so we can't just await Promise.all() here
        while (this.jobs.length > 0) {
            this.randomiseJobsOrder()

            const itemsToResolve = this.jobs.slice(0, this.jobs.length)

            const limit = pLimit(this.maxConcurrentJobs)
            await Promise.all(itemsToResolve.map(item => limit(() => item)))

            // Remove the items we just processed from the front of the job queue
            this.jobs.splice(0, itemsToResolve.length)
        }
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
        await job
    })()
}
