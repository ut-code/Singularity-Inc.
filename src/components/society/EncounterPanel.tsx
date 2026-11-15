import { Check, CircleAlert, MessageSquare } from 'lucide-react';
import { AREAS } from '../../game/data';
import { encounterDefinition } from '../../game/society/encounters';
import type { GameState } from '../../game/types';
import { useGameStore } from '../../state/gameStore';
import { SkillText } from '../SkillText';
import { EncounterConversation } from './EncounterConversation';
import { IncidentPanelFrame } from './IncidentPanelFrame';

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
    const Icon = chat ? MessageSquare : CircleAlert;
    return (
        <IncidentPanelFrame
            title={definition.title}
            showTitle={!chat}
            heading={chat ? definition.contact!.name : area.name}
            label={chat ? `チャット · ${definition.contact!.role}` : 'イベント'}
            description={chat ? undefined : definition.summary}
            Icon={Icon}
            color={chat ? 'var(--text-secondary)' : 'var(--danger)'}
            mapLocation={area}
            onClose={onClose}
        >
            {chat ? (
                <EncounterConversation definition={definition} encounter={encounter} />
            ) : (
                <p className="investigation-question">期限に利用拒否が増え、信頼が低下</p>
            )}
            {encounter.choiceId ? (
                !chat && (
                    <div className="encounter-result">
                        <Check size={17} />
                        <p>
                            <SkillText>{encounter.result!}</SkillText>
                        </p>
                    </div>
                )
            ) : encounter.status === 'pending' ? (
                <fieldset
                    className="encounter-choices"
                    aria-label={chat ? '返信を選ぶ' : '対応を選ぶ'}
                >
                    <legend>{chat ? '返信を選ぶ' : '対応を選ぶ'}</legend>
                    {definition.choices.map((choice) => {
                        return (
                            <button
                                type="button"
                                className="investigation-choice"
                                key={choice.id}
                                disabled={game.skillPoints < choice.cost}
                                onClick={() =>
                                    useGameStore.getState().choose(encounter.id, choice.id)
                                }
                            >
                                <span className="investigation-choice-body">
                                    <span className="investigation-choice-title">
                                        <strong>{choice.label}</strong>
                                    </span>
                                    <span className="investigation-choice-effects">
                                        {'mitigation' in choice ? (
                                            <>
                                                <span>
                                                    利用拒否の増加を
                                                    {Math.round(choice.mitigation.refuse * 100)}
                                                    %軽減
                                                </span>
                                                <span>
                                                    信頼低下を
                                                    {Math.round(choice.mitigation.trust * 100)}%軽減
                                                </span>
                                                {!chat &&
                                                    definition.onDeadline.recover > 0 &&
                                                    choice.mitigation.recover > 0 && (
                                                        <span>
                                                            依存からの回復を
                                                            {Math.round(
                                                                choice.mitigation.recover * 100,
                                                            )}
                                                            %軽減
                                                        </span>
                                                    )}
                                            </>
                                        ) : (
                                            <>
                                                {choice.rewardSP
                                                    ? `+${choice.rewardSP} SP`
                                                    : choice.transfer === 'rely'
                                                      ? '通常利用からAI依存へ'
                                                      : choice.transfer === 'reconcile'
                                                        ? '利用拒否から通常利用へ'
                                                        : 'AI利用者が増加'}
                                                {(choice.trust ?? 0) < 0 ? ' · 不信のリスク' : ''}
                                            </>
                                        )}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </fieldset>
            ) : null}
        </IncidentPanelFrame>
    );
}
