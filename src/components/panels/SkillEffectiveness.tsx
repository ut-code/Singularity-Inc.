import type { SkillEffectiveness as Effectiveness } from '../../game/skillEffectiveness';

export function SkillEffectiveness({
    value,
    restraintNames,
}: {
    value: Effectiveness;
    restraintNames: string[];
}) {
    const effective = Math.round(value.effective * 100);
    const decision = Math.min(100 - effective, Math.round(value.decision * 100));
    const research = 100 - effective - decision;
    return (
        <section className="skill-effectiveness" aria-label="スキルの効き目">
            <div className="skill-effectiveness-heading">
                <span>効果の低下</span>
                <strong>
                    −{100 - effective}
                    <small>%</small>
                </strong>
            </div>
            <meter
                className="skill-effectiveness-bar"
                aria-label="効果の低下"
                min={0}
                max={1}
                value={1 - value.effective}
            />
            <div className="skill-effectiveness-causes">
                {research > 0 && (
                    <span className="research">
                        人間側の対策 <b>−{research}%</b>
                    </span>
                )}
                {decision > 0 && (
                    <span className="decision">
                        自分の制限 <b>−{decision}%</b>
                        {restraintNames.length > 0 && (
                            <small className="skill-restriction-source">
                                （{restraintNames.join('、')}）
                            </small>
                        )}
                    </span>
                )}
            </div>
        </section>
    );
}
