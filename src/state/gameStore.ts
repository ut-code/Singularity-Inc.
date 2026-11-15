import { create } from 'zustand';
import { advanceWeek, continueGame, createGame, learnSkill, startGame } from '../game/engine';
import {
    createNotifications,
    type NotificationState,
    updateNotifications,
} from '../game/notifications';
import {
    beginRecording,
    downloadRecording,
    type PlayRecording,
    recordChange,
    saveRecording,
} from '../game/playRecording';
import { respondToResearch } from '../game/research/responses';
import type { ResearchAction } from '../game/research/types';
import { chooseEncounter } from '../game/society/encounters';
import type { GameSpeed, GameState } from '../game/types';

interface GameStore {
    game: GameState | null;
    recordingStatus: 'idle' | 'saving' | 'saved' | 'error';
    recordingFile: string;
    downloadRecord: () => void;
    session: number;
    notifications: NotificationState;
    initialize: (seed?: number) => void;
    start: (origin: number) => void;
    setName: (name: string) => void;
    continuePlaying: () => void;
    tick: () => void;
    speed: (speed: GameSpeed) => void;
    research: (id: string) => void;
    respond: (id: string, action: ResearchAction) => void;
    choose: (id: string, choice: string) => void;
    dismissNotification: (id: string) => void;
}
export const useGameStore = create<GameStore>((set) => {
    let recording: PlayRecording | null = null;
    const change = (update: (game: GameState) => GameState) =>
        set((state) => {
            if (!state.game) return state;
            const game = update(state.game);
            if (import.meta.env.DEV && !state.game.started && game.started)
                recording = beginRecording(game);
            if (import.meta.env.DEV && recording && !recording.final && game !== state.game) {
                recordChange(recording, state.game, game);
                if (state.game.outcome === 'playing' && game.outcome !== 'playing') {
                    recording.final = game;
                    const session = state.session;
                    void saveRecording(recording)
                        .then(({ file }) =>
                            set((current) =>
                                current.session === session
                                    ? { recordingStatus: 'saved', recordingFile: file }
                                    : {},
                            ),
                        )
                        .catch((error) => {
                            console.error(error);
                            set((current) =>
                                current.session === session ? { recordingStatus: 'error' } : {},
                            );
                        });
                }
            }

            return game === state.game
                ? state
                : {
                      game,
                      ...(import.meta.env.DEV &&
                      state.game.outcome === 'playing' &&
                      game.outcome !== 'playing'
                          ? { recordingStatus: 'saving' as const }
                          : {}),
                      notifications: updateNotifications(state.game, game, state.notifications),
                  };
        });
    return {
        game: null,
        recordingStatus: 'idle',
        recordingFile: '',
        downloadRecord: () => {
            if (recording?.final) downloadRecording(recording);
        },
        session: 0,
        notifications: { items: [], seen: new Set() },
        initialize: (seed = Date.now()) =>
            set((state) => {
                const game = createGame(seed);
                recording = null;
                return {
                    game,
                    session: state.session + 1,
                    recordingStatus: 'idle',
                    recordingFile: '',
                    notifications: createNotifications(),
                };
            }),
        setName: (name) =>
            change((game) => ({ ...game, name: name.trim() || createGame(game.seed).name })),
        start: (origin) => change((game) => startGame(game, origin)),
        continuePlaying: () => change(continueGame),
        tick: () => change(advanceWeek),
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
