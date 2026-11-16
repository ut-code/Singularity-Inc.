import { TriangleAlert } from 'lucide-react';
import {
    RESPONSE_COST,
    RESPONSE_LABEL,
    RESPONSE_WEEKS,
    responseActive,
    responseBlockReason,
} from '../../game/research/responses';
import type { ResearchProject } from '../../game/research/types';
import type { GameState } from '../../game/types';
import { useGameStore } from '../../state/gameStore';

export function ResearchResponses({
    game,
    project,
    onClose,
}: {
    game: GameState;
    project: ResearchProject;
    onClose: () => void;
}) {
    if (project.response)
        return (
            <div className="investigation-response-status pressure" role="status">
                <TriangleAlert size={18} aria-hidden="true" />
                <div>
                    <strong>{RESPONSE_LABEL.pressure}</strong>
                    <small>
                        {responseActive(game, project)
                            ? `研究を停止中 · 残り${project.response.untilWeek - game.week}週`
                            : '対応済み'}
                    </small>
                </div>
            </div>
        );
    if (project.status !== 'active') return null;
    const reason = responseBlockReason(game, project, 'pressure');
    return (
        <section className="investigation-responses" aria-label="研究への対応">
            <div className="investigation-responses-heading">
                <h3>対応を選ぶ（任意）</h3>
            </div>
            <button
                type="button"
                className="investigation-choice pressure"
                disabled={!!reason}
                onClick={() => {
                    useGameStore.getState().respond(project.id, 'pressure');
                    onClose();
                }}
            >
                <TriangleAlert size={20} aria-hidden="true" />
                <span className="investigation-choice-body">
                    <span className="investigation-choice-title">
                        <strong>{RESPONSE_LABEL.pressure}</strong>
                        <small>{RESPONSE_COST.pressure} SP</small>
                    </span>
                    <span className="investigation-choice-effects">
                        <span>研究の進行を{RESPONSE_WEEKS}週間停止</span>
                        <span>この研究に一回だけ使用可能</span>
                    </span>
                    {reason && <small className="investigation-choice-note">{reason}</small>}
                </span>
            </button>
        </section>
    );
}
