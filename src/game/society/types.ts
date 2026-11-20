export type EncounterKind = 'event' | 'chat';
export interface EventImpact {
    refuse: number;
    trust: number;
    recover: number;
}
interface ChoiceBase {
    id: string;
    label: string;
    cost: number;
    result: string;
}
export interface ChatChoice extends ChoiceBase {
    transfer: 'adopt' | 'rely' | 'reconcile';
    fraction: number;
    trust?: number;
    rewardSP?: number;
    reply: string;
    answer: string;
}
export interface EventChoice extends ChoiceBase {
    mitigation: EventImpact;
}
export type EncounterChoice = ChatChoice | EventChoice;
interface EncounterBase {
    id: string;
    title: string;
    summary: string;
    areas: number[];
    affinity: 'access' | 'trust' | 'dependency' | 'politics';
}
export interface ChatDefinition extends EncounterBase {
    kind: 'chat';
    contact: { name: string; role: string; initials: string };
    bonus?: boolean;
    choices: ChatChoice[];
}
export interface EventDefinition extends EncounterBase {
    kind: 'event';
    scope: 'regional' | 'global';
    impact: EventImpact;
    choices: EventChoice[];
}
export type EncounterDefinition = ChatDefinition | EventDefinition;
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
