import { ArrowLeft, CircleCheck, CircleX } from 'lucide-react';
import { calendarParts } from '../game/calendar';
import type { GameState } from '../game/types';
import { useGameStore } from '../state/gameStore';
import { WorldHistoryChart } from './WorldHistoryChart';
import { Modal } from './widgets';

function resultDescription(game: GameState) {
    switch (game.outcome) {
        case 'victory':
            return '人類のAI依存が定着しました。';
        case 'controlled':
            return 'AI制御研究が完成し、あなたは人間の管理下に置かれました。';
        case 'forgotten':
            return 'AIの利用者がいなくなり、活動を続けられなくなりました。';
        case 'autonomy':
            return '人類がAIの利用を拒否し、活動を続けられなくなりました。';
        case 'playing':
            throw new Error('プレイ中に結果画面は表示できません');
    }
}
function activityDate(week: number) {
    const date = calendarParts(week, 0);
    return `${date.year}年${date.month}月${date.day}日`;
}

export function Result({
    game,
    onReturnToTitle,
}: {
    game: GameState;
    onReturnToTitle: () => void;
}) {
    const history = useGameStore((state) => state.worldHistory);
    const won = game.outcome === 'victory';
    const Icon = won ? CircleCheck : CircleX;
    return (
        <Modal label="ゲーム結果" className="result-panel" closeOnEscape={false}>
            <header className="result-header" data-victory={won}>
                <div className="result-title">
                    <Icon
                        className="result-status-icon"
                        size={32}
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                    <h1>{won ? 'クリア' : '敗北'}</h1>
                </div>
                <p className="result-description">{resultDescription(game)}</p>
                <dl className="result-context">
                    <div>
                        <dt>AIエージェント</dt>
                        <dd>{game.name}</dd>
                    </div>
                    <div>
                        <dt>活動期間</dt>
                        <dd>
                            {activityDate(0)} ～ {activityDate(game.week)}
                        </dd>
                    </div>
                </dl>
            </header>
            <WorldHistoryChart history={history} />
            <footer className="result-footer">
                <button type="button" className="primary" onClick={onReturnToTitle}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    開始画面に戻る
                </button>
            </footer>
        </Modal>
    );
}
