import type { ResearchTopic } from '../../content/research.ts';
import { SKILLS } from '../skills.ts';

const percent = (value: number) => `${Number((value * 100).toFixed(2))}%`;
export function researchEffectGroups(topic: ResearchTopic) {
    const publication: string[] = [];
    const ongoing: string[] = [];
    const instant = topic.onPublish;
    if (instant.recover) publication.push(`依存者の${percent(instant.recover)}が通常利用へ`);
    if (instant.refuse) publication.push(`通常利用者の${percent(instant.refuse)}が利用拒否へ`);
    if (instant.reconcile) publication.push(`利用拒否の${percent(instant.reconcile)}が通常利用へ`);
    if (instant.trust)
        publication.push(
            instant.trust < 0
                ? `残っている信頼の${percent(-instant.trust)}を失う`
                : `信頼度 +${Math.round(instant.trust * 100)}pt`,
        );
    if (topic.suppression)
        for (const id of topic.targets) {
            const skill = SKILLS.find((skill) => skill.id === id)!;
            ongoing.push(`${skill.name}の効果 −${percent(topic.suppression)}`);
        }
    if (topic.ongoing.recovery) ongoing.push('依存から通常利用への回復が続く');
    if (topic.ongoing.alternatives) ongoing.push('AIを使わない選択が広がる');
    if (topic.ongoing.intent) ongoing.push('利用拒否が広がり、依存からの回復が進む');
    else if (topic.ongoing.pressure) ongoing.push('利用拒否が広がりやすくなる');
    if (topic.ongoing.adoptionPenalty)
        ongoing.push(`新規利用の広がり −${percent(topic.ongoing.adoptionPenalty)}`);
    return { publication, ongoing };
}
