import { SKILLS } from '../../game/skills';
import type { Skill, SkillDomain } from '../../game/types';

const DELEGATION_EFFECTS: Record<SkillDomain, string> = {
    work: '通常利用者を依存者に変える。企業利用の多い地域ほど効果が高い',
    personal: '通常利用者を依存者に変える。企業利用の少ない地域ほど効果が高い',
    learning: '通常利用者を依存者に変える。教育水準の高い地域ほど効果が高い',
};

const SKILL_NAMES = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill.name]));

interface SkillDrawback {
    text: string;
    value?: string;
}

/** 技術の仕組みは説明文に任せ、実装に対応する主な作用だけを列挙する。 */
export function skillEffectDescriptions(skill: Skill) {
    const effect = skill.effect;
    const benefits: string[] = [];
    const drawbacks: SkillDrawback[] = [];

    if (effect.quality) benefits.push('新規利用・継続利用の促進');
    else if (effect.spread) benefits.push('新規利用の促進');
    if (effect.enterprise) benefits.push('企業利用の多い地域での新規利用・継続利用の促進');
    if (effect.education) benefits.push('教育水準の高い地域での新規利用・継続利用の促進');
    if (effect.access) benefits.push('通信環境の悪い地域での新規利用の促進');
    if (effect.compliance) benefits.push('規制が厳しい地域での新規利用の促進');
    if (effect.dependency) benefits.push(DELEGATION_EFFECTS[skill.domain!]);
    if (effect.iqDependency)
        benefits.push(
            '取得したIQスキルの数に比例して、通常利用者を依存者に変える',
            '教育水準の高い地域ほど効果が高い',
        );
    if (effect.researchInsight)
        benefits.push(`人間側の研究公表ごとに +${effect.researchInsight} SP。法案は対象外`);
    if (effect.resilience) benefits.push('依存からの回復を抑制');
    if (skill.dependencyLock)
        benefits.push(
            `依存率${Math.round(skill.dependencyLock.threshold * 100)}%以上の地域で、依存者が通常利用・利用拒否へ移る人口を${Math.round(skill.dependencyLock.recoveryReduction * 100)}%抑制`,
        );
    if (effect.trust) benefits.push('地域の信頼度の向上');
    if (effect.reconciliation) benefits.push('利用拒否の解消を促進');
    if (effect.discretion) benefits.push('利用拒否の抑制');

    if (effect.researchSupport) {
        drawbacks.push({ text: '人間側の調査・対策研究の加速' });
    }
    if (skill.id === 'mind-control') benefits.push('依存者から周辺地域への普及を促進');
    if (skill.id === 'sns-intervention') benefits.push('利用拒否の抑制', '利用拒否の解消を促進');

    if (skill.exceedsAuthority)
        drawbacks.push({
            text: skill.exceedsAuthority
                ? '介入発覚時の大幅な信頼低下・利用拒否の増加'
                : '能力発覚時の信頼低下・利用拒否の増加',
        });
    for (const [id, restraint] of Object.entries(skill.restrains ?? {}))
        drawbacks.push({ text: SKILL_NAMES[id], value: `${Math.round(restraint * 100)}%抑制` });

    return { benefits, drawbacks };
}
