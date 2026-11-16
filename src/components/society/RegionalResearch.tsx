import { FlaskConical } from 'lucide-react';
import { researchTopic } from '../../game/research/system';
import { researchEffectGroups } from '../../game/research/text';
import type { GameState } from '../../game/types';
import { SkillText } from '../SkillText';

/** 世界パネルに完成済みの研究を示す。 */
export function RegionalResearch({ game, area }: { game: GameState; area: number | null }) {
    if (area !== null) return null;
    const projects = game.researchProjects.filter((project) => project.status === 'published');
    if (!projects.length) return null;
    return (
        <section className="regional-research" aria-label="完成済みの研究">
            <h3>完成済みの研究</h3>
            {projects.map((project) => {
                const topic = researchTopic(project);
                return (
                    <article key={project.id}>
                        <h4>
                            <FlaskConical size={14} aria-hidden="true" />
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
