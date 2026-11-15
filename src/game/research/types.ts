export type ResearchAction = 'cooperate' | 'pressure' | 'stop';
export interface ResearchResponse {
    action: ResearchAction;
    untilWeek: number;
    skillIds: string[];
}
export interface ResearchProject {
    id: string;
    researchId: string;
    instituteId: string;
    jurisdiction?: string;
    progress: number;
    startedWeek: number;
    publishedWeek?: number;
    status: 'active' | 'published';
    response?: ResearchResponse;
    result?: string;
}
