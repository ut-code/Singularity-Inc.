import { Scale } from 'lucide-react';
import { researchApplies, researchTopic } from '../../game/research/system';
import { researchEffectGroups } from '../../game/research/text';
import type { GameState } from '../../game/types';

/** 世界共通の研究を各地域へ重複表示せず、その地域の法律だけを示す。 */
export function RegionalResearch({ game, area }: { game: GameState; area: number }) {
    const laws = game.researchProjects.filter(
        (project) =>
            project.status === 'published' &&
            project.jurisdiction &&
            researchApplies(project, area),
    );
    if (!laws.length) return null;
    return (
        <section className="regional-research" aria-label="この地域の法規制">
            <h3>この地域の法規制</h3>
            {laws.map((project) => {
                const topic = researchTopic(project);
                return (
                    <article key={project.id}>
                        <h4>
                            <Scale size={14} aria-hidden="true" />
                            {topic.name}
                        </h4>
                        {researchEffectGroups(topic).ongoing.map((effect) => (
                            <p key={effect}>{effect}</p>
                        ))}
                    </article>
                );
            })}
        </section>
    );
}
