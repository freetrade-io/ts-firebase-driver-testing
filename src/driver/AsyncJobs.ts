export interface IAsyncJobs {
    pushJob(job: Promise<any>): void
    jobsComplete(): Promise<void>
}
