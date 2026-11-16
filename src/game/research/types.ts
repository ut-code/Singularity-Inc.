export type ResearchAction = 'pressure';
export interface ResearchResponse {
    action: ResearchAction;
    untilWeek: number;
}
export interface ResearchProject {
    id: string;
    researchId: string;
    instituteId: string;
    progress: number;
    startedWeek: number;
    publishedWeek?: number;
    status: 'active' | 'published';
    response?: ResearchResponse;
    result?: string;
}
