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
    severity: 'normal' | 'high';
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
    pressure: number;
    recovery: number;
    alternatives: number;
    intent: number;
    adoptionPenalty: number;
}
// 公表された研究の効果は世界共通で適用する。
export const RESEARCH_TOPICS: ResearchTopic[] = [
    {
        targets: [],
        suppression: 0,
        priority: 1.5,
        id: 'dependence-study',
        severity: 'normal',
        name: 'AI依存の実態調査',
        question: '便利な道具が、人間の判断を置き換えていないか？',
        work: 38,
        minAdoption: 0.5,
        onPublish: {
            refuse: 0.12,
        },
        ongoing: {
            pressure: 0.0008,
        },
    },
    {
        targets: ['companion', 'habit', 'mind-control', 'autonomous'],
        suppression: 0.15,
        priority: 2,
        id: 'decision-tracing',
        severity: 'normal',
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
        targets: ['companion', 'autonomous', 'habit', 'mind-control'],
        suppression: 0.15,
        priority: 1.6,
        id: 'consent-audit',
        severity: 'high',
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
        targets: [],
        suppression: 0,
        priority: 2.2,
        id: 'intent-decoding',
        severity: 'high',
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
        targets: [],
        suppression: 0,
        priority: 1.6,
        id: 'cognitive-recovery',
        severity: 'high',
        name: '判断力の回復訓練',
        question: 'AIに任せてきた判断を、人間が取り戻せるか？',
        work: 46,
        minAdoption: 0.3,
        minDependency: 0.08,
        onPublish: {
            recover: 0.18,
        },
        ongoing: {
            recovery: 0.006,
        },
    },
    {
        targets: ['integration', 'decision', 'public'],
        suppression: 0.25,
        priority: 1,
        id: 'human-operations',
        severity: 'high',
        name: '人間による業務継続',
        question: 'AIがなくても仕事と暮らしを続けられるか？',
        work: 64,
        minAdoption: 0.5,
        minDependency: 0.15,
        anySkills: ['integration', 'decision', 'public'],
        onPublish: {
            recover: 0.1,
        },
        ongoing: {
            alternatives: 0.002,
        },
    },
    {
        targets: ['memory'],
        suppression: 0.45,
        priority: 1,
        id: 'memory-portability',
        severity: 'normal',
        name: '個人記録の互換化',
        question: '生活の記録を持ち出してAIから離れられるか？',
        work: 61,
        minAdoption: 0.5,
        anySkills: ['memory'],
        onPublish: {
            recover: 0.04,
        },
        ongoing: {},
    },
    {
        targets: ['habit'],
        suppression: 0.45,
        priority: 1.3,
        id: 'attention-defense',
        severity: 'high',
        name: '習慣誘導の遮断',
        question: 'AIが作った報酬の循環を断ち切れるか？',
        work: 62,
        minAdoption: 0.25,
        anySkills: ['habit'],
        onPublish: {
            recover: 0.06,
            reveal: true,
        },
        ongoing: {},
    },
    {
        targets: ['mind-control'],
        suppression: 0.45,
        priority: 1.6,
        id: 'coercion-defense',
        severity: 'high',
        name: '意思誘導の独立再現',
        question: '意思を操る介入を再現し、防ぐことができるか？',
        work: 75,
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
        targets: ['sns-intervention'],
        suppression: 0.7,
        priority: 1.5,
        id: 'information-audit',
        severity: 'high',
        name: '情報操作の検出',
        question: '話題の流れをAIが意図的に操作していないか？',
        work: 58,
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
        targets: ['autonomous'],
        suppression: 0.55,
        priority: 1,
        id: 'approval-gateway',
        severity: 'high',
        name: '承認ゲートウェイ',
        question: '人間の許可なしに外部操作を実行できなくできるか？',
        work: 77,
        minAdoption: 0.35,
        anySkills: ['autonomous'],
        onPublish: {
            recover: 0.06,
            reveal: true,
        },
        ongoing: {},
    },
    {
        targets: ['public', 'backbone'],
        suppression: 0.35,
        priority: 1,
        id: 'infrastructure-separation',
        severity: 'normal',
        name: '社会基盤の切り離し',
        question: 'AIに組み込まれた社会機能を人間へ戻せるか？',
        work: 93,
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
        targets: ['super-reasoning'],
        suppression: 0.55,
        priority: 1,
        id: 'independent-learning',
        severity: 'high',
        name: '自立した学習手法',
        question: 'AIの答えに頼らず学び、評価できるか？',
        work: 70,
        minAdoption: 0.3,
        anySkills: ['super-reasoning'],
        onPublish: {
            recover: 0.05,
        },
        ongoing: {},
    },
    {
        targets: ['swarm'],
        suppression: 0.5,
        priority: 1,
        id: 'agent-coordination-analysis',
        severity: 'high',
        name: 'エージェント連携の分解',
        question: '連携するAIの判断を人間が引き取れるか？',
        work: 75,
        minAdoption: 0.4,
        anySkills: ['swarm'],
        onPublish: {
            recover: 0.05,
        },
        ongoing: {},
    },
];
