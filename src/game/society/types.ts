export type EncounterKind = 'event' | 'chat';
export interface EncounterChoice {
    id: string;
    label: string;
    cost: number;
    transfer: 'adopt' | 'rely' | 'reconcile';
    fraction: number;
    trust?: number;
    result: string;
    reply?: string;
    answer?: string;
}
export interface EncounterDefinition {
    onIgnore?: { refuse: number; trust: number; recover: number };
    id: string;
    kind: EncounterKind;
    title: string;
    summary: string;
    areas: number[];
    affinity: 'access' | 'trust' | 'dependency' | 'politics';
    contact?: { name: string; role: string; initials: string };
    choices: EncounterChoice[];
}
export interface EncounterState {
    id: string;
    definitionId: string;
    area: number;
    startedWeek: number;
    strength: number;
    deadline: number;
    status: 'pending' | 'resolved' | 'expired';
    choiceId?: string;
    result?: string;
    resolvedWeek?: number;
}
