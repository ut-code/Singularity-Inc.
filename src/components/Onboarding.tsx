import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONTROL_ALERT, CONTROL_CAUTION } from '../game/control';
import { WEEK_MS } from '../game/data';
import { metrics } from '../game/metrics';
import type { GameState } from '../game/types';
import { Coachmark, type CoachmarkPoint } from './Coachmark';

const element = (selector: string): CoachmarkPoint | null => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, height: r.height };
};

/** プリセットで飛ばした期間の案内は再生せず、その後の新しい警告だけ残す。 */
function presetShownHints(game: GameState) {
    const ids = [
        'initial',
        'skills',
        'control',
        'research',
        'scandal',
        'chat',
        'dependency',
        'refusal',
    ];
    if (game.controlProgress >= CONTROL_CAUTION) ids.push('control-caution');
    if (game.controlProgress >= CONTROL_ALERT) ids.push('control-alert');
    if (metrics(game).antiAI >= 0.1) ids.push('refusal-ten');
    if (game.researchProjects.some((project) => project.researchId === 'intent-decoding'))
        ids.push('critical');
    return ids;
}

export function Onboarding({
    game,
    blocked,
    selfImprovementOpen,
    skipExistingHints,
}: {
    game: GameState;
    blocked: boolean;
    selfImprovementOpen: boolean;
    skipExistingHints: boolean;
}) {
    const shown = useRef(new Set<string>(skipExistingHints ? presetShownHints(game) : [])),
        opened = useRef(skipExistingHints);
    if (selfImprovementOpen) opened.current = true;
    const [active, setActive] = useState<string | null>(null),
        dismiss = useCallback(() => setActive(null), []);
    const everOpened = opened.current;
    const hints = useMemo(
        () => [
            {
                id: 'control-alert',
                when: game.controlProgress >= CONTROL_ALERT,
                text: 'AI制御研究が完成間近です。100%で敗北します',
                target: () => element('.control-hud'),
            },
            {
                id: 'control-caution',
                when: game.controlProgress >= CONTROL_CAUTION,
                text: 'AI制御研究が進展しています。100%で敗北します',
                target: () => element('.control-hud'),
            },
            {
                id: 'skills',
                when: !everOpened && game.week * WEEK_MS >= 24000,
                text: 'ここでAIの能力を強化できます',
                target: () => element('[data-coachmark="self-improvement"]'),
            },
            {
                id: 'control',
                when: game.controlStarted,
                text: 'AI制御研究が100%になると敗北します',
                target: () => element('.control-hud'),
            },
            {
                id: 'critical',
                when: true,
                text: 'AIの目的に関する重要研究です',
                target: () => element('.map-encounter-marker[data-encounter-id="intent-decoding"]'),
            },
        ],
        [game.controlProgress, game.week, game.controlStarted, everOpened],
    );
    useEffect(() => {
        if (active === 'skills' && everOpened) {
            setActive(null);
            return;
        }
        if (!blocked && active && !hints.find((hint) => hint.id === active)?.target()) {
            setActive(null);
            return;
        }
        if (active || blocked || game.outcome !== 'playing') return;
        for (const hint of hints) {
            if (!hint.when || shown.current.has(hint.id)) continue;
            const point = hint.target();
            if (!point) continue;
            shown.current.add(hint.id);
            setActive(hint.id);
            break;
        }
    }, [hints, active, blocked, everOpened, game.outcome]);
    const hint = hints.find((h) => h.id === active),
        point = hint?.target();
    if (!hint || !point || blocked || game.outcome !== 'playing') return null;
    return (
        <Coachmark
            key={hint.id}
            point={point}
            text={hint.text}
            tailSide={point.x < window.innerWidth / 2 ? 'left' : 'right'}
            speed={game.speed}
            onExpire={dismiss}
        />
    );
}
