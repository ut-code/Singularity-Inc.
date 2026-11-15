import { useId } from 'react';
import { SkillText } from '../SkillText';

export function ResearchEfficiency({
    value,
    modifiers = [],
}: {
    value: number;
    modifiers?: string[];
}) {
    const helpId = useId();
    return (
        <div className="research-efficiency">
            <div className="research-efficiency-help">
                <button type="button" aria-describedby={helpId}>
                    研究効率 <strong>{Math.round(value * 100)}%</strong>
                </button>
                <span id={helpId} role="tooltip" className="research-efficiency-tooltip">
                    AI利用率が増えると速くなり、AI依存率が増えると遅くなります。
                </span>
            </div>
            {modifiers.map((modifier) => (
                <small key={modifier}>
                    <SkillText>{modifier}</SkillText>適用中
                </small>
            ))}
        </div>
    );
}
