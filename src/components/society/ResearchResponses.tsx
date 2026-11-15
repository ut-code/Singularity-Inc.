import { Handshake, Pause, TriangleAlert } from 'lucide-react';
import {
    COOPERATION_IMPACT_REDUCTION,
    PRESSURE_TRUST_PENALTY,
    RESPONSE_COST,
    RESPONSE_LABEL,
    RESPONSE_WEEKS,
    respondToResearch,
    responseActive,
    responseAvailable,
    responseBlockReason,
    responseResearchMultiplier,
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
    const isLaw = researchTopic(project).category === 'regulation';
    const completion = isLaw ? '成立時' : '公表時';
    const scope = isLaw ? '地域' : '世界';
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
                            ? `残り${project.response.untilWeek - game.week}週${project.response.action === 'pressure' ? `／${completion}に信頼度 −${PRESSURE_TRUST_PENALTY * 100}pt` : ''}`
                            : project.response.action === 'cooperate' && project.status === 'active'
                              ? `${completion}の軽減を適用中`
                              : project.response.action === 'pressure' &&
                                  project.status === 'active'
                                ? `${completion}に信頼度 −${PRESSURE_TRUST_PENALTY * 100}pt`
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
                <h3>対応を選ぶ（任意）</h3>
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
                const change =
                    action === 'pressure'
                        ? responseResearchMultiplier(game, {
                              ...project,
                              response: {
                                  action,
                                  untilWeek: game.week + RESPONSE_WEEKS,
                                  skillIds: [],
                              },
                          }) - 1
                        : baseline > 0
                          ? researchRate(preview, next) / baseline - 1
                          : 0;
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
                                    研究速度 {change > 0 ? '+' : '−'}
                                    {Math.round(Math.abs(change) * 100)}%
                                    {action === 'pressure' && (
                                        <small className="investigation-choice-scaling">
                                            依存率に応じて上昇
                                        </small>
                                    )}
                                    {action === 'cooperate' && '、信頼度 +3pt'}
                                </span>
                                <span>
                                    {action === 'stop'
                                        ? `対象機能を${RESPONSE_WEEKS}週停止`
                                        : action === 'cooperate'
                                          ? `${completion}の信頼低下・利用拒否増加を${Math.round(COOPERATION_IMPACT_REDUCTION * 100)}%軽減`
                                          : `${completion}に${scope}の信頼度 −${PRESSURE_TRUST_PENALTY * 100}pt`}
                                </span>
                            </span>
                            {reason && (
                                <small className="investigation-choice-note">{reason}</small>
                            )}
                        </span>
                    </button>
                );
            })}
        </section>
    );
}
