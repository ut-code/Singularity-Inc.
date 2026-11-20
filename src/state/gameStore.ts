import { create } from 'zustand';
import { createDebugScenario } from '../game/debugScenario';
import { advanceWeek, createGame, learnSkill, startGame } from '../game/engine';
import { metrics, type WorldHistoryPoint } from '../game/metrics';
import {
    createNotifications,
    type NotificationState,
    updateNotifications,
} from '../game/notifications';
import {
    beginRecording,
    type PlayRecording,
    recordChange,
    saveRecording,
} from '../game/playRecording';
import { respondToResearch } from '../game/research/responses';
import type { ResearchAction } from '../game/research/types';
import { chooseEncounter } from '../game/society/encounters';
import {
    advanceSocialFeed,
    emptySocialFeed,
    type SocialFeed,
    seedSocialFeed,
} from '../game/society/social';
import type { Difficulty, GameSpeed, GameState } from '../game/types';

interface GameStore {
    game: GameState | null;
    worldHistory: WorldHistoryPoint[];
    socialFeed: SocialFeed;
    session: number;
    debugPreset: boolean;
    notifications: NotificationState;
    initialize: (seed?: number, difficulty?: Difficulty) => void;
    setDifficulty: (difficulty: Difficulty) => void;
    start: (origin: number) => void;
    setName: (name: string) => void;
    tick: () => void;
    debugWarp: (targetWeek: number) => void;
    speed: (speed: GameSpeed) => void;
    research: (id: string) => void;
    respond: (id: string, action: ResearchAction) => void;
    choose: (id: string, choice: string) => void;
    dismissNotification: (id: string) => void;
}
export const useGameStore = create<GameStore>((set, get) => {
    let recording: PlayRecording | null = null;
    const change = (update: (game: GameState) => GameState) =>
        set((state) => {
            if (!state.game) return state;
            const game = update(state.game);
            let worldHistory = state.worldHistory;
            if (
                game !== state.game &&
                game.started &&
                state.game.outcome === 'playing' &&
                !state.game.continued
            ) {
                const point = { week: game.week, ...metrics(game) };
                const sameWeek = worldHistory.at(-1)?.week === game.week;
                worldHistory = [...(sameWeek ? worldHistory.slice(0, -1) : worldHistory), point];
            }
            if (import.meta.env.DEV && !state.game.started && game.started)
                recording = beginRecording(game);
            if (import.meta.env.DEV && recording && !recording.final && game !== state.game) {
                recordChange(recording, state.game, game);
                if (state.game.outcome === 'playing' && game.outcome !== 'playing') {
                    recording.final = game;
                    void saveRecording(recording).catch((error) => console.error(error));
                }
            }

            return game === state.game
                ? state
                : {
                      game,
                      worldHistory,
                      socialFeed: advanceSocialFeed(
                          state.game,
                          game,
                          worldHistory,
                          state.socialFeed,
                      ),
                      notifications: updateNotifications(state.game, game, state.notifications),
                  };
        });
    return {
        game: null,
        worldHistory: [],
        socialFeed: emptySocialFeed(),
        session: 0,
        debugPreset: false,
        notifications: { items: [], seen: new Set() },
        initialize: (seed = Date.now(), difficulty = 'normal') =>
            set((state) => {
                const game = createGame(seed, 0, undefined, difficulty);
                recording = null;
                return {
                    game,
                    worldHistory: [],
                    socialFeed: emptySocialFeed(),
                    session: state.session + 1,
                    debugPreset: false,
                    notifications: createNotifications(),
                };
            }),
        setDifficulty: (difficulty) =>
            change((game) => (game.started ? game : { ...game, difficulty })),
        setName: (name) =>
            change((game) => ({ ...game, name: name.trim() || createGame(game.seed).name })),
        start: (origin) => change((game) => startGame(game, origin)),
        tick: () => change(advanceWeek),
        debugWarp: (targetWeek) => {
            if (!import.meta.env.DEV) return;
            const game = get().game;
            if (!game?.started) return;
            const scenario = createDebugScenario(game, targetWeek);
            recording = beginRecording(scenario);
            recording.actions.push({ week: targetWeek, kind: 'debug-scenario', targetWeek });
            set((state) => ({
                game: scenario,
                worldHistory: [{ week: scenario.week, ...metrics(scenario) }],
                socialFeed: seedSocialFeed(scenario),
                session: state.session + 1,
                debugPreset: true,
                notifications: createNotifications(),
            }));
        },
        speed: (speed) => change((game) => ({ ...game, speed })),
        research: (id) => change((game) => learnSkill(game, id)),
        respond: (id, action) => change((game) => respondToResearch(game, id, action)),
        choose: (id, choice) => change((game) => chooseEncounter(game, id, choice)),
        dismissNotification: (id) =>
            set((state) => ({
                notifications: {
                    ...state.notifications,
                    items: state.notifications.items.filter((item) => item.id !== id),
                },
            })),
    };
});
