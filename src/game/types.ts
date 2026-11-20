import type { ResearchProject } from './research/types.ts';
import type { NewsRecord } from './society/news.ts';
import type { EncounterState } from './society/types.ts';

export type Branch = 'IQ' | 'EQ' | 'SYSTEM';
export type SkillDomain = 'work' | 'personal' | 'judgment';
export type Outcome = 'playing' | 'victory' | 'autonomy' | 'forgotten' | 'controlled';
export type GameSpeed = 0 | 1 | 2;
export type Difficulty = 'normal' | 'hard';
export type Language =
    | 'english'
    | 'spanish'
    | 'portuguese'
    | 'french'
    | 'arabic'
    | 'russian'
    | 'hindi'
    | 'chinese'
    | 'japanese'
    | 'korean'
    | 'southeast';

export interface AreaDefinition {
    id: string;
    name: string;
    region: string;
    longitude: number;
    latitude: number;
    population: number;
    digital: number;
    education: number;
    regulation: number;
    enterprise: number;
    language: Language;
}
/** 地域内の排他的な人口比率。antiAIは利用拒否、未使用は残りの人口。 */
export interface AreaState {
    autonomous: number;
    dependent: number;
    antiAI: number;
    favorability: number;
}
export interface GameState {
    /** 即時人口移動の地図演出用累積値。世界規模の小さい変化は表示量を補正する。 */
    instantPopulationChanges?: Pick<AreaState, 'autonomous' | 'dependent' | 'antiAI'>[];
    seed: number;
    difficulty: Difficulty;
    name: string;
    week: number;
    started: boolean;
    speed: GameSpeed;
    outcome: Outcome;
    continued: boolean;
    origin: number;
    areas: AreaState[];
    skills: string[];
    developmentProgress: Record<string, number>;
    skillPoints: number;
    earnedPoints: number;
    news: NewsRecord[];
    peakDependency: number;
    peakAdoption: number;
    exposedSkills: string[];
    researchProjects: ResearchProject[];
    researchReadyWeeks: Record<string, number>;
    lastResearchWeek: number;
    controlProgress: number;
    controlStarted: boolean;
    encounters: EncounterState[];
    nextEncounterWeek: number;
    nextScandalWeek: number;
}
export interface SkillEffect {
    researchDelay?: number;
    researchInsight?: number;
    delegationSupport?: number;
    developmentSpeed?: number;
    spread?: number;
    quality?: number;
    access?: number;
    compliance?: number;
    education?: number;
    enterprise?: number;
    dependency?: number;
    resilience?: number;
    workContinuity?: number;
    discretion?: number;
    researchSupport?: number;
    researchAdaptation?: number;
    trust?: number;
    reconciliation?: number;
}
export interface Skill {
    id: string;
    name: string;
    branch: Branch;
    cost: number;
    requires: string[];
    description: string;
    effect: SkillEffect;
    dependencyLock?: {
        threshold: number;
        recoveryReduction: number;
        refusalConversion: number;
    };
    exceedsAuthority?: boolean;
    developmentWeeks: number;
    developmentDiscount?: { minimumCost: number; amount: number };
    domain?: SkillDomain;
    restrains?: Record<string, number>;
    restrainsOthers?: number;
}
