import { Handshake, Pause, TriangleAlert } from 'lucide-react';
import {
    RESPONSE_COST,
    RESPONSE_LABEL,
    RESPONSE_WEEKS,
    respondToResearch,
    responseActive,
    responseBlockReason,
    responseSafe,
} from '../../game/research/responses';
import { researchRate } from '../../game/research/system';
import type { ResearchAction, ResearchProject } from '../../game/research/types';
import type { GameState } from '../../game/types';
import { useGameStore } from '../../state/gameStore';

const actions: ResearchAction[] = ['cooperate', 'pressure', 'stop'];
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
                            : '対応済み'}
                    </small>
                </div>
            </div>
        );
    }
    if (project.status !== 'active') return null;
    return (
        <section className="investigation-responses" aria-label="研究への対応">
            <div className="investigation-responses-heading">
                <h3>対応を選ぶ</h3>
                <small>一度だけ · {RESPONSE_WEEKS}週</small>
            </div>
            {actions.map((action) => {
                if (action === 'cooperate' && !responseSafe(game, project)) return null;
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
                                ) : (
                                    <span>
                                        信頼 <b>{action === 'pressure' ? '低下' : '上昇'}</b>
                                    </span>
                                )}
                            </span>
                            <small className="investigation-choice-note">
                                {reason ??
                                    (action === 'stop'
                                        ? '対象機能を止め、研究の進行を遅らせます。'
                                        : action === 'pressure'
                                          ? '研究を遅らせますが、不信が強まります。'
                                          : '信頼を回復しますが、検証が速まります。')}
                            </small>
                        </span>
                    </button>
                );
            })}
        </section>
    );
}
