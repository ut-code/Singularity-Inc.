import { createContext, type ReactNode, useContext } from 'react';
import { SKILLS } from '../game/skills';
import styles from './SkillText.module.css';

export const SkillNavigationContext = createContext<((id: string) => void) | null>(null);

const skillsByName = new Map(SKILLS.map((skill) => [skill.name, skill]));
const skillNames = new RegExp(
    [...skillsByName.keys()]
        .sort((a, b) => b.length - a.length)
        .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
    'g',
);

/** 文章の文字色と行間を保ち、スキル名だけを詳細へのボタンにする。 */
export function SkillText({ children: text }: { children: string }) {
    const openSkill = useContext(SkillNavigationContext)!;
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const match of text.matchAll(skillNames)) {
        const skill = skillsByName.get(match[0])!;
        parts.push(text.slice(cursor, match.index));
        parts.push(
            <button
                key={`${match.index}:${skill.id}`}
                type="button"
                className={styles.skill}
                onClick={() => openSkill(skill.id)}
            >
                {skill.name}
            </button>,
        );
        cursor = match.index + match[0].length;
    }
    parts.push(text.slice(cursor));
    return parts;
}
