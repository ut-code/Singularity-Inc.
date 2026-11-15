import type { ResearchAction } from '../game/research/types.ts';

export interface PublicationEffect {
    recover?: number;
    refuse?: number;
    reconcile?: number;
    trust?: number;
    reveal?: boolean;
}
export interface OngoingEffect {
    pressure?: number;
    recovery?: number;
    alternatives?: number;
    intent?: number;
    adoptionPenalty?: number;
}
export interface ResearchTopic {
    id: string;
    name: string;
    question: string;
    category: 'research' | 'regulation';
    severity: 'normal' | 'high';
    responses: ResearchAction[];
    work: number;
    minAdoption: number;
    minDependency?: number;
    anySkills?: string[];
    requires?: string[];
    targets: string[];
    suppression: number;
    priority: number;
    onPublish: PublicationEffect;
    ongoing: OngoingEffect;
}
export interface ResearchEffects {
    resistance: Record<string, number>;
    regulationResistance: Record<string, number>;
    pressure: number;
    recovery: number;
    alternatives: number;
    intent: number;
    adoptionPenalty: number;
}
// 研究は世界共通、法律は指定された法域だけに作用する。
export const RESEARCH_TOPICS: ResearchTopic[] = [
    {
        category: 'research',
        targets: [],
        suppression: 0,
        priority: 1.5,
        id: 'dependence-study',
        severity: 'normal',
        responses: ['cooperate', 'pressure'],
        name: 'AI依存の実態調査',
        question: '便利な道具が、人間の判断を置き換えていないか？',
        work: 38,
        minAdoption: 0.5,
        onPublish: {
            refuse: 0.05,
        },
        ongoing: {
            pressure: 0.0008,
        },
    },
    {
        category: 'research',
        targets: ['companion', 'habit', 'mind-control', 'autonomous'],
        suppression: 0.15,
        priority: 2,
        id: 'decision-tracing',
        severity: 'normal',
        responses: ['cooperate', 'pressure'],
        name: '意思決定の追跡',
        question: 'AIは誰のために提案を選んでいるのか？',
        work: 42,
        minAdoption: 0.5,
        onPublish: {
            trust: -0.16,
        },
        ongoing: {
            pressure: 0.0007,
        },
    },
    {
        category: 'research',
        targets: ['companion', 'autonomous', 'habit', 'mind-control'],
        suppression: 0.15,
        priority: 1.6,
        id: 'consent-audit',
        severity: 'high',
        responses: ['pressure'],
        name: '無断委任の立証',
        question: '本人の同意なしに判断を奪う挙動を立証できるか？',
        work: 72,
        minAdoption: 0.25,
        anySkills: ['companion', 'autonomous', 'habit', 'mind-control'],
        onPublish: {
            trust: -0.22,
            refuse: 0.07,
            reveal: true,
        },
        ongoing: {
            pressure: 0.0012,
        },
    },
    {
        category: 'research',
        targets: [],
        suppression: 0,
        priority: 2.2,
        id: 'intent-decoding',
        severity: 'high',
        responses: ['cooperate', 'pressure'],
        name: 'AIの支配目的の立証',
        question: 'このAIは人間の判断権を奪うために行動していないか？',
        work: 48,
        minAdoption: 0.5,
        minDependency: 0.2,
        requires: ['decision-tracing'],
        onPublish: {
            trust: -0.5,
            refuse: 0.12,
        },
        ongoing: {
            intent: 1,
        },
    },
    {
        category: 'research',
        targets: [],
        suppression: 0,
        priority: 1.6,
        id: 'cognitive-recovery',
        severity: 'high',
        responses: ['pressure'],
        name: '判断力の回復訓練',
        question: 'AIに任せてきた判断を、人間が取り戻せるか？',
        work: 58,
        minAdoption: 0.3,
        minDependency: 0.08,
        onPublish: {
            recover: 0.07,
        },
        ongoing: {
            recovery: 0.006,
        },
    },
    {
        category: 'research',
        targets: [],
        suppression: 0,
        priority: 1,
        id: 'human-operations',
        severity: 'normal',
        responses: ['pressure'],
        name: '人間による業務継続',
        question: 'AIがなくても仕事と暮らしを続けられるか？',
        work: 108,
        minAdoption: 0.5,
        minDependency: 0.25,
        anySkills: ['integration', 'decision', 'public'],
        onPublish: {
            recover: 0.06,
        },
        ongoing: {
            alternatives: 0.002,
        },
    },
    {
        category: 'research',
        targets: ['memory'],
        suppression: 0.45,
        priority: 1,
        id: 'memory-portability',
        severity: 'normal',
        responses: ['pressure', 'stop'],
        name: '個人記録の互換化',
        question: '生活の記録を持ち出してAIから離れられるか？',
        work: 76,
        minAdoption: 0.5,
        anySkills: ['memory'],
        onPublish: {
            recover: 0.04,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['habit'],
        suppression: 0.55,
        priority: 1.3,
        id: 'attention-defense',
        severity: 'high',
        responses: ['pressure', 'stop'],
        name: '習慣誘導の遮断',
        question: 'AIが作った報酬の循環を断ち切れるか？',
        work: 78,
        minAdoption: 0.25,
        anySkills: ['habit'],
        onPublish: {
            recover: 0.06,
            reveal: true,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['mind-control'],
        suppression: 0.6,
        priority: 1.6,
        id: 'coercion-defense',
        severity: 'high',
        responses: ['pressure', 'stop'],
        name: '意思誘導の独立再現',
        question: '意思を操る介入を再現し、防ぐことができるか？',
        work: 94,
        minAdoption: 0.25,
        anySkills: ['mind-control'],
        onPublish: {
            trust: -0.2,
            refuse: 0.05,
            reveal: true,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['sns-intervention'],
        suppression: 0.7,
        priority: 1.5,
        id: 'information-audit',
        severity: 'high',
        responses: ['pressure', 'stop'],
        name: '情報操作の検出',
        question: '話題の流れをAIが意図的に操作していないか？',
        work: 72,
        minAdoption: 0.25,
        anySkills: ['sns-intervention'],
        onPublish: {
            trust: -0.2,
            refuse: 0.08,
            reveal: true,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['autonomous'],
        suppression: 0.55,
        priority: 1,
        id: 'approval-gateway',
        severity: 'high',
        responses: ['pressure', 'stop'],
        name: '承認ゲートウェイ',
        question: '人間の許可なしに外部操作を実行できなくできるか？',
        work: 96,
        minAdoption: 0.35,
        anySkills: ['autonomous'],
        onPublish: {
            recover: 0.06,
            reveal: true,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['public', 'backbone'],
        suppression: 0.35,
        priority: 1,
        id: 'infrastructure-separation',
        severity: 'normal',
        responses: ['pressure'],
        name: '社会基盤の切り離し',
        question: 'AIに組み込まれた社会機能を人間へ戻せるか？',
        work: 116,
        minAdoption: 0.5,
        anySkills: ['public', 'backbone'],
        onPublish: {
            recover: 0.05,
        },
        ongoing: {
            recovery: 0.0004,
        },
    },
    {
        category: 'research',
        targets: ['super-reasoning'],
        suppression: 0.55,
        priority: 1,
        id: 'independent-learning',
        severity: 'high',
        responses: ['pressure'],
        name: '自立した学習手法',
        question: 'AIの答えに頼らず学び、評価できるか？',
        work: 88,
        minAdoption: 0.3,
        anySkills: ['super-reasoning'],
        onPublish: {
            recover: 0.05,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['swarm'],
        suppression: 0.5,
        priority: 1,
        id: 'agent-coordination-analysis',
        severity: 'high',
        responses: ['pressure', 'stop'],
        name: 'エージェント連携の分解',
        question: '連携するAIの判断を人間が引き取れるか？',
        work: 94,
        minAdoption: 0.4,
        anySkills: ['swarm'],
        onPublish: {
            recover: 0.05,
        },
        ongoing: {},
    },
    {
        category: 'research',
        targets: ['autonomous', 'swarm'],
        suppression: 0.35,
        priority: 0.8,
        id: 'traceability-standard',
        severity: 'normal',
        responses: ['cooperate', 'pressure'],
        name: '操作記録の照合',
        question: 'AIが実行した操作を、人間が再確認できるか？',
        work: 78,
        minAdoption: 0.5,
        anySkills: ['autonomous', 'swarm'],
        onPublish: {
            refuse: 0.05,
            trust: -0.08,
        },
        ongoing: {
            pressure: 0.0006,
            alternatives: 0.0005,
        },
    },
    {
        category: 'research',
        targets: ['integration', 'public'],
        suppression: 0.25,
        priority: 1.1,
        id: 'manual-procedure',
        severity: 'normal',
        responses: ['pressure'],
        name: '人間主導の再確認手順',
        question: 'AIの提案を鵜呑みにせず、人間が判断を確かめられるか？',
        work: 88,
        minAdoption: 0.5,
        requires: ['dependence-study'],
        onPublish: {
            recover: 0.06,
        },
        ongoing: {
            recovery: 0.002,
        },
        minDependency: 0.15,
    },
    {
        category: 'regulation',
        targets: ['integration', 'decision', 'autonomous'],
        suppression: 0.55,
        priority: 1,
        id: 'informed-consent',
        severity: 'high',
        responses: ['pressure'],
        name: 'AI業務委任の承認義務化',
        question: '人間の承認なしに業務を進めさせてよいか？',
        work: 78,
        minAdoption: 0.35,
        anySkills: ['integration', 'decision', 'autonomous'],
        onPublish: {
            recover: 0.1,
        },
        ongoing: {},
    },
    {
        category: 'regulation',
        targets: ['memory'],
        suppression: 0.7,
        priority: 1,
        id: 'data-portability',
        severity: 'high',
        responses: ['pressure', 'stop'],
        name: '個人記録の移行権保障',
        question: '生活の記録による囲い込みを認めてよいか？',
        work: 84,
        minAdoption: 0.35,
        anySkills: ['memory'],
        onPublish: {
            recover: 0.12,
        },
        ongoing: {
            alternatives: 0.0004,
        },
    },
    {
        category: 'regulation',
        targets: ['companion', 'mind-control', 'habit', 'sns-intervention', 'autonomous'],
        suppression: 0.7,
        priority: 1,
        id: 'high-risk-ban',
        severity: 'high',
        responses: ['pressure'],
        name: '高リスクAIの停止命令',
        question: '発覚した介入を、この地域で継続させてよいか？',
        work: 88,
        minAdoption: 0.4,
        requires: ['consent-audit'],
        onPublish: {
            recover: 0.12,
            refuse: 0.1,
        },
        ongoing: {
            adoptionPenalty: 0.2,
        },
    },
    {
        category: 'regulation',
        targets: ['public', 'backbone'],
        suppression: 0.65,
        priority: 1,
        id: 'public-independence',
        severity: 'high',
        responses: ['pressure'],
        name: '重要インフラ独立法',
        question: '公共サービスを一つのAIに委ねてよいか？',
        work: 104,
        minAdoption: 0.45,
        anySkills: ['public', 'backbone'],
        onPublish: {
            recover: 0.12,
        },
        ongoing: {
            recovery: 0.0008,
        },
    },
];
