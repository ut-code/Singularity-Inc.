import { FlaskConical, Scale } from 'lucide-react';
import { researchApplies, researchTopic } from '../../game/research/system';
import { researchEffectGroups } from '../../game/research/text';
import type { GameState } from '../../game/types';
import { SkillText } from '../SkillText';

/** 世界パネルには研究を、地域パネルにはその地域の法規制を示す。 */
export function RegionalResearch({ game, area }: { game: GameState; area: number | null }) {
    const laws = game.researchProjects.filter(
        (project) =>
            project.status === 'published' &&
            (area === null
                ? !project.jurisdiction
                : project.jurisdiction && researchApplies(project, area)),
    );
    if (!laws.length) return null;
    return (
        <section
            className="regional-research"
            aria-label={area === null ? '完成済みの研究' : '成立済みの法規制'}
        >
            <h3>{area === null ? '完成済みの研究' : '成立済みの法規制'}</h3>
            {laws.map((project) => {
                const topic = researchTopic(project);
                return (
                    <article key={project.id}>
                        <h4>
                            {area === null ? (
                                <FlaskConical size={14} aria-hidden="true" />
                            ) : (
                                <Scale size={14} aria-hidden="true" />
                            )}
                            {topic.name}
                        </h4>
                        {researchEffectGroups(topic).ongoing.map((effect) => (
                            <p key={effect}>
                                <SkillText>{effect}</SkillText>
                            </p>
                        ))}
                    </article>
                );
            })}
        </section>
    );
}
