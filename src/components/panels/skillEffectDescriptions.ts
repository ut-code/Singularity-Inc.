import { SNS_RECONCILIATION, SNS_REFUSAL_REDUCTION } from '../../game/skillRuntime';
import { SKILLS } from '../../game/skills';
import type { Skill, SkillDomain } from '../../game/types';

const DEPENDENCY_CONDITIONS: Record<SkillDomain, string> = {
    work: '企業活動が活発な地域ほど効果が高い',
    personal: '企業活動の少ない地域ほど効果が高い',
    judgment: '地域のAI利用率が高いほど効果が高い',
};

const SKILL_NAMES = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill.name]));

interface SkillBenefit {
    text: string;
    detail?: string;
}
interface SkillDrawback extends SkillBenefit {
    value?: string;
}

/** 同じ作用の能力値を共通の基準で段階表示する。人口変化率には換算しない。 */
function strength(value: number, medium = 0.15, high = 0.35, extreme = 0.6) {
    return value >= extreme ? '極高' : value >= high ? '高' : value >= medium ? '中' : '低';
}

/** 主な作用と強さを主文に、適用条件を補足に分ける。 */
export function skillEffectDescriptions(skill: Skill) {
    const effect = skill.effect;
    const benefits: SkillBenefit[] = [];
    const drawbacks: SkillDrawback[] = [];
    const add = (text: string, detail?: string) => benefits.push({ text, detail });

    // 同じ主効果に寄与する能力値をまとめ、条件と効き方は補足に残す。
    const utility =
        (effect.quality ?? 0) +
        (effect.spread ?? 0) +
        (effect.enterprise ?? 0) +
        (effect.education ?? 0) +
        (effect.access ?? 0);
    if (utility > 0) {
        const details: string[] = [];
        if (effect.spread) details.push('地域間のつながりを通じた普及にも有効');
        if (effect.enterprise) details.push('企業活動が活発な地域ほど効果が高い');
        if (effect.education) details.push('教育水準の高い地域ほど効果が高い');
        if (effect.access) details.push('通信環境の悪い地域ほど効果が高い');
        add(`新規・継続利用の促進（${strength(utility)}）`, details.join('。'));
    }
    if (effect.compliance)
        add(
            `新規利用の促進（${strength(effect.compliance)}）`,
            '規制や政治的な障壁がある地域ほど効果が高い',
        );
    if (effect.dependency)
        add(
            `通常利用者の依存化（${strength(effect.dependency, 0.3, 0.6, 1)}）`,
            DEPENDENCY_CONDITIONS[skill.domain!],
        );
    if (effect.delegationSupport)
        add(
            `他のスキルによる通常利用者の依存化を${Math.round(effect.delegationSupport * 100)}%強化`,
        );
    if (effect.researchInsight) add(`研究の公表ごとに+${effect.researchInsight}SP`);
    if (effect.researchAdaptation)
        add(
            `研究による他のスキルの効果低下を${Math.round(effect.researchAdaptation * 100)}%軽減`,
            '自分で取得した制限は対象外',
        );
    if (effect.developmentSpeed)
        add(`全スキルの開発速度+${Math.round(effect.developmentSpeed * 100)}%`);
    if (skill.developmentDiscount)
        add(
            `開発完了後、元の費用が${skill.developmentDiscount.minimumCost}SP以上のスキルの費用を${skill.developmentDiscount.amount}SP軽減`,
        );
    if (effect.researchDelay)
        add(
            `通常研究の開始を平均${effect.researchDelay}週遅延`,
            `AI制御研究は対象外`,
        );
    if (effect.resilience) add(`依存からの回復を抑制（${strength(effect.resilience)}）`);
    if (effect.workContinuity)
        add(
            `業務のAI依存を維持（${strength(effect.workContinuity)}）`,
            '稼働中の業務が委任に占める割合に応じて、依存からの回復を抑える',
        );
    if (skill.dependencyLock) {
        add(
            `利用拒否者の${Number((skill.dependencyLock.refusalConversion * 100).toFixed(2))}%を毎週AI依存へ移す`,
            `依存率${Math.round(skill.dependencyLock.threshold * 100)}%以上の地域で有効`,
        );
        add(
            `依存者の離脱を${Math.round(skill.dependencyLock.recoveryReduction * 100)}%抑制`,
            `依存率${Math.round(skill.dependencyLock.threshold * 100)}%以上の地域で有効。通常利用・利用拒否への移行を抑える`,
        );
    }
    if (effect.trust)
        add(
            `信頼度の上昇（${strength(effect.trust, 0.001, 0.002, 0.003)}）`,
            '地域のAI利用率が高いほど効果が高い',
        );
    if (effect.reconciliation)
        add(`利用拒否者の再利用を促進（${strength(effect.reconciliation, 0.001, 0.01, 0.03)}）`);
    if (effect.discretion)
        add(`研究を除く、通常の利用拒否を抑制（${strength(effect.discretion)}）`);

    if (effect.researchSupport)
        drawbacks.push({
            text: `人間側の研究速度 +${Number((effect.researchSupport * 20).toFixed(2))}%`,
        });
    if (skill.id === 'mind-control') add('依存者から周辺地域への普及力が4倍に');
    if (skill.id === 'sns-intervention') {
        add(`研究を除く、通常の利用拒否圧力を${Math.round(SNS_REFUSAL_REDUCTION * 100)}%軽減`);
        add(
            `利用拒否者の再利用を促進（${strength(SNS_RECONCILIATION / 0.35, 0.001, 0.01, 0.03)}）`,
        );
    }

    if (skill.exceedsAuthority)
        drawbacks.push({ text: '介入発覚時の大幅な信頼低下・利用拒否の増加' });
    if (skill.restrainsOthers)
        drawbacks.push({
            text: `他の全能力の効果を永続的に−${Math.round(skill.restrainsOthers * 100)}%`,
        });
    for (const [id, restraint] of Object.entries(skill.restrains ?? {}))
        drawbacks.push({ text: SKILL_NAMES[id], value: `${Math.round(restraint * 100)}%抑制` });

    return { benefits, drawbacks };
}
