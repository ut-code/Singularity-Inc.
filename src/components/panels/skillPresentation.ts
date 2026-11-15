import {
    BookOpen,
    Brain,
    Building2,
    CheckCheck,
    CircleCheck,
    Compass,
    Cpu,
    Database,
    FlaskConical,
    HeartHandshake,
    Lightbulb,
    type LucideIcon,
    MessageCircle,
    Network,
    ScanSearch,
    School,
    Server,
    Settings,
    ShieldCheck,
    Workflow,
} from 'lucide-react';
import { SKILL_CONTENT } from '../../content/skills';
import { SKILL_BRANCH_CONTENT } from '../../content/skillTree';
import type { SkillIcon } from '../../game/contentTypes';
import type { Branch } from '../../game/types';

const icons = {
    BookOpen,
    Brain,
    Building2,
    CheckCheck,
    CircleCheck,
    Compass,
    Cpu,
    Database,
    FlaskConical,
    HeartHandshake,
    Lightbulb,
    MessageCircle,
    Network,
    ScanSearch,
    School,
    Server,
    Settings,
    ShieldCheck,
    Workflow,
} satisfies Record<SkillIcon, LucideIcon>;

export const SKILL_BRANCHES = Object.fromEntries(
    Object.entries(SKILL_BRANCH_CONTENT).map(([branch, content]) => [
        branch,
        { ...content, icon: icons[content.icon] },
    ]),
) as Record<Branch, { icon: LucideIcon; label: string }>;

export const SKILL_PRESENTATION: Record<string, { icon: LucideIcon }> = Object.fromEntries(
    SKILL_CONTENT.map((skill) => [skill.id, { icon: icons[skill.icon] }]),
);
