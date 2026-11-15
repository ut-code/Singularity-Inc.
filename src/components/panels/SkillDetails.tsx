import { LockKeyhole, TriangleAlert } from 'lucide-react';
import { responseActive, responseRegionName } from '../../game/research/responses';
import { skillEffectiveness } from '../../game/skillEffectiveness';
import { skillStatusLabel } from '../../game/skillRuntime';
import { hasDependencyEffect, SKILLS, skillBlockReason, skillReachable } from '../../game/skills';
import type { GameState, Skill } from '../../game/types';
import { SkillEffectiveness } from './SkillEffectiveness';
import { skillEffectDescriptions } from './skillEffectDescriptions';
import { SKILL_BRANCHES, SKILL_PRESENTATION } from './skillPresentation';

export function SkillDetails({
    game,
    skill,
    onResearch,
}: {
    game: GameState;
    skill: Skill;
    onResearch: (id: string) => void;
}) {
    const owned = game.skills.includes(skill.id);
    const locked = !skillReachable(game, skill);
    const reason = skillBlockReason(game, skill);
    const { benefits, drawbacks } = skillEffectDescriptions(skill);
    const effectiveness = owned ? skillEffectiveness(game)[skill.id] : null;
    const restraints = owned
        ? SKILLS.filter(
              (item) =>
                  game.skills.includes(item.id) &&
                  game.developmentProgress[item.id] > 0 &&
                  item.restrains?.[skill.id],
          )
        : [];
    const limits = game.researchProjects.filter(
        (project) =>
            responseActive(game, project) &&
            project.response!.action === 'stop' &&
            project.response!.skillIds.includes(skill.id),
    );
    const Icon = SKILL_PRESENTATION[skill.id].icon;
    const dependency = hasDependencyEffect(skill);
    return (
        <aside
            className={`skill-details ${skill.branch.toLowerCase()}`}
            aria-label="選択したスキルの詳細"
        >
            <div>
                <Icon className="skill-detail-icon" size={30} aria-hidden="true" />
                <div className="skill-detail-heading">
                    <span>{SKILL_BRANCHES[skill.branch].label}</span>
                    <span>
                        {owned ? skillStatusLabel(game, skill.id) : locked ? '未解放' : '開発可能'}
                    </span>
                </div>
                <h2>{skill.name}</h2>
                {(dependency || skill.exceedsAuthority) && (
                    <div className="skill-traits">
                        {dependency && <span className="dependency-trait">依存性あり</span>}
                        {skill.exceedsAuthority && (
                            <span className="harmful-trait">
                                <TriangleAlert size={13} />
                                有害な介入
                            </span>
                        )}
                    </div>
                )}
                <p>{skill.description}</p>
                <section className="skill-effect-list" aria-label="スキルの効果">
                    <h3>効果</h3>
                    <ul aria-label="メリット">
                        {benefits.map((benefit) => (
                            <li key={benefit}>{benefit}</li>
                        ))}
                    </ul>
                    {drawbacks.length > 0 && (
                        <ul className="skill-drawbacks" aria-label="デメリット">
                            {drawbacks.map((drawback) => (
                                <li key={drawback.text}>
                                    {drawback.value
                                        ? `${drawback.text}の効果を${drawback.value}`
                                        : drawback.text}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                {effectiveness && (effectiveness.effective < 0.995 || limits.length > 0) && (
                    <SkillEffectiveness skill={skill} value={effectiveness} />
                )}
                {limits.map((project) => (
                    <p key={project.id} className="skill-local-limit">
                        {responseRegionName(project)}で停止中 · 残り
                        {project.response!.untilWeek - game.week}週
                    </p>
                ))}
                {restraints.length > 0 && (
                    <p className="skill-local-limit">
                        {restraints.map((item) => item.name).join('・')}で制限中
                    </p>
                )}
                <div className="skill-detail-cost">
                    <span>コスト</span>
                    <strong>
                        {skill.cost}
                        <small>SP</small>
                    </strong>
                </div>
                {skill.developmentWeeks > 0 && <p>開発期間 {skill.developmentWeeks}週</p>}
                {owned && game.developmentProgress[skill.id] < 1 && (
                    <progress
                        aria-label="スキルの開発進捗"
                        value={game.developmentProgress[skill.id]}
                        max={1}
                    />
                )}
            </div>
            <button
                type="button"
                className="primary"
                disabled={reason !== null}
                onClick={() => onResearch(skill.id)}
            >
                {owned ? (
                    skillStatusLabel(game, skill.id)
                ) : locked ? (
                    <>
                        <LockKeyhole className="skill-detail-lock" size={16} aria-hidden="true" />
                        <span>{reason}</span>
                    </>
                ) : (
                    (reason ?? `開発する · ${skill.cost} SP`)
                )}
            </button>
        </aside>
    );
}
