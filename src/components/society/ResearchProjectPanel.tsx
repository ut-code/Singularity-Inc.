import { ShieldCheck } from 'lucide-react';
import { controlEfficiency } from '../../game/control';
import { instituteFor } from '../../game/research/locations';
import { RESPONSE_LABEL, responseActive } from '../../game/research/responses';
import { researchEfficiency, researchTopic } from '../../game/research/system';
import { researchEffectGroups } from '../../game/research/text';
import { activeSkillEffects } from '../../game/skillRuntime';
import { SKILLS } from '../../game/skills';
import type { GameState } from '../../game/types';
import { ContinuousProgress, useProjectedGame } from '../ContinuousProgress';
import { SkillText } from '../SkillText';
import { IncidentPanelFrame } from './IncidentPanelFrame';
import { ResearchEfficiency } from './ResearchEfficiency';
import { ResearchProgress } from './ResearchProgress';
import { ResearchResponses } from './ResearchResponses';
import { researchPresentation } from './researchPresentation';

export function ResearchProjectPanel({
    game,
    id,
    onClose,
    onOpenSkill,
}: {
    game: GameState;
    id: string;
    onClose: () => void;
    onOpenSkill: (id: string) => void;
}) {
    const project = game.researchProjects.find((item) => item.id === id)!;
    const topic = researchTopic(project);
    const institute = instituteFor(project);
    const { Icon, label, color } = researchPresentation(project);
    const effects = researchEffectGroups(topic);
    const modifiers: string[] = [];
    if (activeSkillEffects(game).researchSupport > 0) modifiers.push('仮説生成・研究支援');
    if (responseActive(game, project)) modifiers.push(RESPONSE_LABEL[project.response!.action]);
    return (
        <IncidentPanelFrame
            title={topic.name}
            heading={institute.name}
            label={`${label} · 全世界`}
            description={topic.question}
            Icon={Icon}
            color={color}
            mapLocation={institute}
            onClose={onClose}
        >
            <div className="investigation-progress">
                <ResearchEfficiency
                    value={researchEfficiency(game, project)}
                    modifiers={modifiers}
                />
                <ResearchProgress project={project} label="研究の進捗" />
            </div>
            <ResearchResponses game={game} project={project} onClose={onClose} />
            <div className="investigation-effect-groups">
                {[
                    {
                        title: '公表時の効果',
                        items: effects.publication,
                    },
                    { title: '継続する効果', items: effects.ongoing },
                ]
                    .filter((group) => group.items.length)
                    .map((group) => (
                        <section
                            className="research-impact investigation-findings"
                            key={group.title}
                        >
                            <h3>{group.title}</h3>
                            <ul className="research-effects">
                                {group.items.map((effect) => (
                                    <li key={effect}>
                                        <Icon size={16} style={{ color }} aria-hidden="true" />
                                        <span>
                                            <SkillText>{effect}</SkillText>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                {topic.targets.length > 0 && (
                    <section className="investigation-findings">
                        <h3>対象スキル</h3>
                        <div className="research-target-skills">
                            {topic.targets.map((id) => (
                                <button type="button" key={id} onClick={() => onOpenSkill(id)}>
                                    {SKILLS.find((skill) => skill.id === id)!.name}
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </IncidentPanelFrame>
    );
}

export function ControlResearchPanel({ game, onClose }: { game: GameState; onClose: () => void }) {
    const projected = useProjectedGame();
    return (
        <IncidentPanelFrame
            title="AI制御研究"
            heading="人間側の研究"
            label="全世界"
            description="AIを安全なサンドボックスで管理する研究。"
            Icon={ShieldCheck}
            color="var(--accent)"
            onClose={onClose}
        >
            <div className="investigation-progress">
                <ResearchEfficiency value={controlEfficiency(game)} />
                <ContinuousProgress
                    value={game.controlProgress * 100}
                    nextValue={projected.controlProgress * 100}
                    label="AI制御研究の進捗"
                />
            </div>
            <section className="research-impact investigation-findings">
                <h3>完成時の効果</h3>
                <ul className="research-effects">
                    <li>
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span>人間の管理下に置かれ、敗北</span>
                    </li>
                </ul>
            </section>
        </IncidentPanelFrame>
    );
}
