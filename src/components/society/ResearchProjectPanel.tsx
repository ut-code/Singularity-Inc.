import { type LucideIcon, ShieldCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { controlEfficiency } from '../../game/control';
import { JURISDICTIONS } from '../../game/regions';
import { instituteFor } from '../../game/research/locations';
import { RESPONSE_LABEL, responseActive } from '../../game/research/responses';
import { researchEfficiency, researchTopic } from '../../game/research/system';
import { researchEffectGroups } from '../../game/research/text';
import { activeSkillEffects } from '../../game/skillRuntime';
import { SKILLS } from '../../game/skills';
import type { GameState } from '../../game/types';
import { ContinuousProgress, useProjectedGame } from '../ContinuousProgress';
import type { MapLocation } from '../useMapAnchor';
import { Modal } from '../widgets';
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
    const regulation = topic.category === 'regulation';
    const institute = instituteFor(project);
    const scope = project.jurisdiction
        ? JURISDICTIONS.find((item) => item.id === project.jurisdiction)!.name
        : '全世界';
    const { Icon, label, color } = researchPresentation(project);
    const effects = researchEffectGroups(topic, project);
    const modifiers: string[] = [];
    if (activeSkillEffects(game).researchSupport > 0) modifiers.push('研究支援');
    if (responseActive(game, project)) modifiers.push(RESPONSE_LABEL[project.response!.action]);
    return (
        <ResearchPanelFrame
            title={topic.name}
            heading={regulation ? `${scope}の規制当局` : institute.name}
            label={`${label} · ${scope}`}
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
                <ResearchProgress
                    project={project}
                    label={regulation ? '法案の進捗' : '研究の進捗'}
                />
            </div>
            <ResearchResponses game={game} project={project} onClose={onClose} />
            <div className="investigation-effect-groups">
                {[
                    {
                        title: regulation ? '成立時の効果' : '公表時の効果',
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
                                        <span>{effect}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                {topic.targets.length > 0 && (
                    <div className="research-target-skills">
                        {topic.targets.map((id) => (
                            <button type="button" key={id} onClick={() => onOpenSkill(id)}>
                                {SKILLS.find((skill) => skill.id === id)!.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </ResearchPanelFrame>
    );
}

export function ControlResearchPanel({ game, onClose }: { game: GameState; onClose: () => void }) {
    const projected = useProjectedGame();
    return (
        <ResearchPanelFrame
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
        </ResearchPanelFrame>
    );
}

function ResearchPanelFrame({
    title,
    heading,
    label,
    description,
    Icon,
    color,
    mapLocation,
    onClose,
    children,
}: {
    title: string;
    heading: string;
    label: string;
    description: string;
    Icon: LucideIcon;
    color: string;
    mapLocation?: MapLocation;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <Modal modal={false} label={title} onClose={onClose} mapLocation={mapLocation}>
            <div className="investigation-panel">
                <div className="society-heading">
                    <div className="contact-heading">
                        <Icon size={28} style={{ color }} />
                        <div>
                            <span className="eyebrow">{label}</span>
                            <h2>{heading}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="icon-button"
                        aria-label="閉じる"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>
                <h2 className="investigation-title">{title}</h2>
                <p className="investigation-question">{description}</p>
                {children}
            </div>
        </Modal>
    );
}
