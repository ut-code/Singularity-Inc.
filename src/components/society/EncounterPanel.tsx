import { CalendarDays, Check, MessageSquare, X } from 'lucide-react';
import { AREAS } from '../../game/data';
import { encounterDefinition } from '../../game/society/encounters';
import type { GameState } from '../../game/types';
import { useGameStore } from '../../state/gameStore';
import { Modal } from '../widgets';
import { EncounterConversation } from './EncounterConversation';

export function EncounterPanel({
    game,
    id,
    onClose,
}: {
    game: GameState;
    id: string;
    onClose: () => void;
}) {
    const encounter = game.encounters.find((item) => item.id === id)!;
    const definition = encounterDefinition(encounter);
    const area = AREAS[encounter.area];
    const chat = definition.kind === 'chat';
    const Icon = chat ? MessageSquare : CalendarDays;
    return (
        <Modal modal={false} label={definition.title} onClose={onClose} mapLocation={area}>
            <div className={`encounter-panel ${chat ? 'conversation-panel' : ''}`}>
                <div className="society-heading">
                    <div className="contact-heading">
                        {chat ? (
                            <span className="contact-avatar">{definition.contact!.initials}</span>
                        ) : (
                            <Icon size={26} />
                        )}
                        <div>
                            <span className="eyebrow">
                                {chat ? definition.contact!.role : area.name}
                            </span>
                            <h2>{chat ? definition.contact!.name : definition.title}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="icon-button"
                        aria-label="閉じる"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="encounter-meta">
                    {area.name}
                    <span>
                        {encounter.status === 'pending'
                            ? `残り${encounter.deadline - game.week}週`
                            : '対応済み'}
                    </span>
                </div>
                {chat ? (
                    <EncounterConversation definition={definition} encounter={encounter} />
                ) : (
                    <div>
                        <p className="event-summary">{definition.summary}</p>
                        <small className="encounter-risk">未対応：利用拒否が増え、信頼が低下</small>
                    </div>
                )}
                {encounter.status === 'resolved' ? (
                    !chat && (
                        <div className="encounter-result">
                            <Check size={17} />
                            <p>{encounter.result}</p>
                        </div>
                    )
                ) : (
                    <fieldset
                        className="encounter-choices"
                        aria-label={chat ? '返信を選ぶ' : '対応を選ぶ'}
                    >
                        {definition.choices.map((choice) => {
                            return (
                                <button
                                    type="button"
                                    key={choice.id}
                                    disabled={game.skillPoints < choice.cost}
                                    onClick={() =>
                                        useGameStore.getState().choose(encounter.id, choice.id)
                                    }
                                >
                                    <div>
                                        <strong>{choice.label}</strong>
                                        <span>
                                            {choice.cost === 0 ? '無料' : `${choice.cost} SP`}
                                        </span>
                                    </div>
                                    <small>
                                        {choice.transfer === 'rely'
                                            ? '依存上昇'
                                            : choice.transfer === 'reconcile'
                                              ? '利用拒否の緩和'
                                              : '利用拡大'}
                                        {(choice.trust ?? 0) < 0 ? ' · 不信のリスク' : ''}
                                    </small>
                                </button>
                            );
                        })}
                    </fieldset>
                )}
            </div>
        </Modal>
    );
}
