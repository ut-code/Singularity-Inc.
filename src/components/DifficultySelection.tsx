import { DIFFICULTY_SETTINGS } from '../game/difficulty';
import type { Difficulty } from '../game/types';
import { EntryNavigation } from './EntryNavigation';

export function DifficultySelection({
    onSelect,
    onBack,
    onContinue,
    selected,
}: {
    onSelect: (difficulty: Difficulty) => void;
    onBack: () => void;
    onContinue: () => void;
    selected: Difficulty;
}) {
    return (
        <section className="game-introduction" aria-labelledby="difficulty-title">
            <div className="introduction-content glass">
                <h1 id="difficulty-title">難易度を選択</h1>
                <fieldset className="difficulty-options" aria-label="難易度">
                    {(['normal', 'hard'] as Difficulty[]).map((difficulty) => (
                        <button
                            key={difficulty}
                            type="button"
                            className="difficulty-option"
                            aria-pressed={selected === difficulty}
                            onClick={() => onSelect(difficulty)}
                        >
                            <strong>{DIFFICULTY_SETTINGS[difficulty].label}</strong>
                            <div className="effect-list">
                                <ul>
                                    <li>
                                        定期支給{' '}
                                        {DIFFICULTY_SETTINGS[difficulty].regularSPIntervalWeeks}
                                        週ごとに1 SP
                                    </li>
                                    <li>
                                        AI制御研究の必要量{' '}
                                        {DIFFICULTY_SETTINGS[difficulty].controlWork}
                                    </li>
                                </ul>
                            </div>
                        </button>
                    ))}
                </fieldset>
                <EntryNavigation onBack={onBack} onNext={onContinue} />
            </div>
        </section>
    );
}
