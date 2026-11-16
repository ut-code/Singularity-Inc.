import { Network, X } from 'lucide-react';
import { useState } from 'react';
import { SKILLS } from '../../game/skills';
import type { GameState } from '../../game/types';
import { SkillNavigationContext } from '../SkillText';
import { SkillDetails } from './SkillDetails';
import { SkillTreeMap } from './SkillTreeMap';

export function SkillTreePanel({
    game,
    onResearch,
    onClose,
    initialSkill,
}: {
    game: GameState;
    onResearch: (id: string) => void;
    onClose: () => void;
    initialSkill?: string;
}) {
    const initial = initialSkill ? SKILLS.find((skill) => skill.id === initialSkill)! : SKILLS[0];
    const [selected, setSelected] = useState(initialSkill ? initial.id : 'reason');
    const skill = SKILLS.find((item) => item.id === selected)!;
    return (
        <section className="research-workspace" aria-label="スキルツリー">
            <header className="research-heading">
                <h1>
                    <Network size={22} aria-hidden="true" />
                    スキルツリー
                </h1>
                <div className="research-budget">
                    <span>残り</span>
                    <strong>
                        {game.skillPoints}
                        <small>SP</small>
                    </strong>
                </div>
                <button
                    type="button"
                    className="icon-button"
                    aria-label="スキルツリーを閉じる"
                    onClick={onClose}
                >
                    <X size={22} />
                </button>
            </header>
            <div className="research-layout">
                <SkillTreeMap game={game} selectedId={selected} onSelect={setSelected} />
                <SkillNavigationContext value={setSelected}>
                    <SkillDetails game={game} skill={skill} onResearch={onResearch} />
                </SkillNavigationContext>
            </div>
        </section>
    );
}
