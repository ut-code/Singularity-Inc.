import { Network } from 'lucide-react';

export function SkillTreeButton({
    points,
    speed,
    onClick,
}: {
    points: number;
    speed: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className="skill-tree-button glass"
            data-coachmark="self-improvement"
            data-animation-speed={speed}
            aria-label="スキルツリー"
            onClick={onClick}
        >
            <Network size={20} aria-hidden="true" />
            <span>スキルツリー</span>
            <b>
                {points} <small>SP</small>
            </b>
        </button>
    );
}
