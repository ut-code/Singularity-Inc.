import { Check, CircleAlert, MessageSquare } from 'lucide-react';
import { AREAS } from '../../game/data';
import { encounterDefinition } from '../../game/society/encounters';
import type { GameState } from '../../game/types';
import { useGameStore } from '../../state/gameStore';
import { SkillText } from '../SkillText';
import { EncounterConversation } from './EncounterConversation';
import { IncidentPanelFrame } from './IncidentPanelFrame';

const EVENT_EFFECTS = [
    { key: 'refuse', label: '利用率' },
    { key: 'trust', label: '信頼度' },
    { key: 'recover', label: '依存率' },
] as const;

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
    const impacts = chat ? [] : EVENT_EFFECTS.filter(({ key }) => definition.impact[key] > 0);
    const Icon = chat ? MessageSquare : CircleAlert;
    return (
        <IncidentPanelFrame
            title={definition.title}
            showTitle={!chat}
            heading={chat ? definition.contact!.name : area.name}
            label={
                chat
                    ? `チャット · ${definition.contact!.role}`
                    : definition.scope === 'global'
                      ? 'イベント · 全世界'
                      : 'イベント · この地域'
            }
            description={chat ? undefined : definition.summary}
            Icon={Icon}
            color={chat ? 'var(--text-secondary)' : 'var(--danger)'}
            mapLocation={area}
            onClose={onClose}
        >
            {chat ? (
                <EncounterConversation definition={definition} encounter={encounter} />
            ) : encounter.status === 'pending' ? (
                <p className="investigation-question">
                    未対応で期限を迎えると
                    {definition.scope === 'global' ? '世界中で' : 'この地域で'}
                    {impacts.map(({ label }) => label).join('・')}が低下
                </p>
            ) : null}
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
                                onClick={() => {
                                    useGameStore.getState().choose(encounter.id, choice.id);
                                    if (!chat) onClose();
                                }}
                            >
                                <span className="investigation-choice-body">
                                    <span className="investigation-choice-title">
                                        <strong>{choice.label}</strong>
                                    </span>
                                    <span className="investigation-choice-effects">
                                        {'mitigation' in choice ? (
                                            [...impacts]
                                                .filter(({ key }) => choice.mitigation[key] === 1)
                                                .map(({ key, label }) => (
                                                    <span key={key}>{label}の低下を無効化</span>
                                                ))
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
