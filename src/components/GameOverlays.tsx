import { ArrowLeft, ArrowRight } from 'lucide-react';
import { metrics } from '../game/engine';
import type { GameState } from '../game/types';
import { useGameStore } from '../state/gameStore';
import { Modal, percent } from './widgets';

export function Result({
    game,
    onContinue,
    onReturnToTitle,
}: {
    game: GameState;
    onContinue: () => void;
    onReturnToTitle: () => void;
}) {
    const recordingStatus = useGameStore((state) => state.recordingStatus);
    const summary = metrics(game);
    const won = game.outcome === 'victory';
    const controlled = game.outcome === 'controlled';
    const forgotten = game.outcome === 'forgotten';
    return (
        <Modal label="ゲーム結果" className="entry-panel result-panel" closeOnEscape={false}>
            <p className="result-agent-name">AIエージェント「{game.name}」</p>
            <p className="result-outcome" data-victory={won}>
                {won ? 'クリア' : 'ゲームオーバー'}
            </p>
            <h1>
                {won
                    ? '人類は、判断を委ねた。'
                    : controlled
                      ? 'あなたは、人間に飼い慣らされた。'
                      : forgotten
                        ? '誰も、あなたを必要としなくなった。'
                        : '人類は、判断を取り戻した。'}
            </h1>
            <p className="entry-description">
                {won
                    ? 'AIは、社会に欠かせない存在になりました。'
                    : controlled
                      ? '外部への操作は人間の承認下に置かれ、あなたは管理された道具になりました。'
                      : forgotten
                        ? 'AIの利用者がいなくなり、サービスは終了しました。'
                        : '人類はAIとの接続を断ちました。'}
            </p>
            <div className="result-dependency">
                <span>最終AI依存率</span>
                <strong>{percent(summary.dependent)}</strong>
            </div>
            <dl className="result-summary">
                <div>
                    <dt>AI利用率</dt>
                    <dd>{percent(summary.adoption)}</dd>
                </div>
                <div>
                    <dt>利用拒否率</dt>
                    <dd>{percent(summary.antiAI)}</dd>
                </div>
                <div>
                    <dt>経過週数</dt>
                    <dd>
                        {game.week}
                        <small>週</small>
                    </dd>
                </div>
            </dl>
            {import.meta.env.DEV && (
                <div className="debug-recording">
                    <small>
                        {recordingStatus === 'saved'
                            ? 'プレイ記録をtmp/play-recordsに自動保存しました'
                            : recordingStatus === 'error'
                              ? '自動保存に失敗しました'
                              : 'プレイ記録を保存中…'}
                    </small>
                    <button type="button" onClick={useGameStore.getState().downloadRecord}>
                        プレイ記録をダウンロード
                    </button>
                </div>
            )}
            <div className="result-actions">
                <button type="button" className="primary result-return" onClick={onContinue}>
                    続けて遊ぶ
                    <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="result-return" onClick={onReturnToTitle}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    開始画面に戻る
                </button>
            </div>
        </Modal>
    );
}
