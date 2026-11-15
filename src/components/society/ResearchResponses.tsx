import { Handshake, Pause, TriangleAlert } from 'lucide-react';
import {
    COOPERATION_IMPACT_REDUCTION,
    RESPONSE_COST,
    RESPONSE_LABEL,
    respondToResearch,
    responseActive,
    responseAvailable,
    responseBlockReason,
} from '../../game/research/responses';
import { researchRate, researchTopic } from '../../game/research/system';
import type { ResearchProject } from '../../game/research/types';
import type { GameState } from '../../game/types';
import { useGameStore } from '../../state/gameStore';

const icons = { cooperate: Handshake, pressure: TriangleAlert, stop: Pause };
export function ResearchResponses({
    game,
    project,
    onClose,
}: {
    game: GameState;
    project: ResearchProject;
    onClose: () => void;
}) {
    if (project.response) {
        const Icon = icons[project.response.action];
        return (
            <div
                className={`investigation-response-status ${project.response.action}`}
                role="status"
            >
                <Icon size={18} />
                <div>
                    <strong>{RESPONSE_LABEL[project.response.action]}</strong>
                    <small>
                        {responseActive(game, project)
                            ? `残り${project.response.untilWeek - game.week}週`
                            : project.response.action === 'cooperate' && project.status === 'active'
                              ? '公表時の軽減を適用中'
                              : '対応済み'}
                    </small>
                </div>
            </div>
        );
    }
    if (project.status !== 'active') return null;
    const actions = researchTopic(project).responses.filter((action) =>
        responseAvailable(game, project, action),
    );
    if (!actions.length) return null;
    return (
        <section className="investigation-responses" aria-label="研究への対応">
            <div className="investigation-responses-heading">
                <h3>対応を選ぶ</h3>
                <small>一度だけ</small>
            </div>
            {actions.map((action) => {
                const reason = responseBlockReason(game, project, action);
                const preview = respondToResearch(
                    { ...game, skillPoints: Math.max(game.skillPoints, RESPONSE_COST[action]) },
                    project.id,
                    action,
                );
                const next = preview.researchProjects.find((item) => item.id === project.id)!;
                const baseline = researchRate(game, project);
                const change = baseline > 0 ? researchRate(preview, next) / baseline - 1 : 0;
                const degree =
                    Math.abs(change) >= 0.25 ? '大' : Math.abs(change) >= 0.08 ? '中' : '小';
                const Icon = icons[action];
                return (
                    <button
                        type="button"
                        key={action}
                        className={`investigation-choice ${action}`}
                        disabled={!!reason}
                        onClick={() => {
                            useGameStore.getState().respond(project.id, action);
                            onClose();
                        }}
                    >
                        <Icon size={20} aria-hidden="true" />
                        <span className="investigation-choice-body">
                            <span className="investigation-choice-title">
                                <strong>{RESPONSE_LABEL[action]}</strong>
                                <small>{RESPONSE_COST[action]} SP</small>
                            </span>
                            <span className="investigation-choice-effects">
                                <span>
                                    研究速度{' '}
                                    <b>
                                        {change > 0 ? '上昇' : '低下'} {degree}
                                    </b>
                                </span>
                                {action === 'stop' ? (
                                    <span>
                                        対象機能 <b>停止</b>
                                    </span>
                                ) : action === 'cooperate' ? (
                                    <span>
                                        公表時の信頼低下・拒否増加{' '}
                                        <b>{Math.round(COOPERATION_IMPACT_REDUCTION * 100)}%軽減</b>
                                    </span>
                                ) : (
                                    <span>
                                        信頼 <b>低下</b>
                                    </span>
                                )}
                            </span>
                            <small className="investigation-choice-note">
                                {reason ??
                                    (action === 'stop'
                                        ? '12週、対象機能を止めて研究を遅らせます。'
                                        : action === 'pressure'
                                          ? '12週、研究を遅らせますが、不信が強まります。'
                                          : '信頼+3。研究速度は12週上昇し、継続効果は軽減しません。')}
                            </small>
                        </span>
                    </button>
                );
            })}
        </section>
    );
}
