import { Check } from 'lucide-react';
import type { ChatDefinition, EncounterState } from '../../game/society/types';
import { SkillText } from '../SkillText';
import { type ConversationMessage, useConversationPlayback } from './useConversationPlayback';

export function EncounterConversation({
    definition,
    encounter,
}: {
    definition: ChatDefinition;
    encounter: EncounterState;
}) {
    const choice = definition.choices.find((item) => item.id === encounter.choiceId);
    const messages: ConversationMessage[] = [
        { id: 'opening', role: 'contact', text: definition.summary },
    ];
    if (choice)
        messages.push(
            { id: 'answer', role: 'player', text: choice.answer! },
            { id: 'reply', role: 'contact', text: choice.reply! },
            { id: 'result', role: 'system', text: choice.result },
        );
    const playback = useConversationPlayback(messages);
    return (
        <div
            className="conversation-log"
            data-animation-clock="manual"
            role="log"
            aria-label="対話履歴"
            aria-live="polite"
            aria-busy={playback.busy}
        >
            {playback.messages.map((message) =>
                message.role === 'system' ? (
                    <div className="encounter-result" key={message.id}>
                        <Check size={17} />
                        <p>
                            <SkillText>{message.text}</SkillText>
                        </p>
                    </div>
                ) : (
                    <article className={`conversation-message ${message.role}`} key={message.id}>
                        <small>
                            {message.role === 'player' ? 'あなた' : definition.contact!.name}
                        </small>
                        <p>
                            <SkillText>{message.text}</SkillText>
                        </p>
                    </article>
                ),
            )}
            {playback.streamingMessage && (
                <article className="conversation-message player" aria-label="あなた、返信を生成中">
                    <small>あなた</small>
                    <p>
                        <SkillText>{playback.streamingText}</SkillText>
                        <span className="conversation-cursor" aria-hidden="true" />
                    </p>
                </article>
            )}
            {playback.waitingForContact && (
                <article
                    className="conversation-message contact"
                    aria-label={`${definition.contact!.name}が入力中`}
                >
                    <small>{definition.contact!.name}</small>
                    <div className="conversation-typing" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </div>
                </article>
            )}
        </div>
    );
}
