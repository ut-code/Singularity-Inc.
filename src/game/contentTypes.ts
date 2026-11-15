import type { Skill } from './types.ts';

export type SkillIcon =
    | 'BookOpen'
    | 'Brain'
    | 'Building2'
    | 'CheckCheck'
    | 'CircleCheck'
    | 'Compass'
    | 'Cpu'
    | 'Database'
    | 'FlaskConical'
    | 'HeartHandshake'
    | 'Lightbulb'
    | 'MessageCircle'
    | 'Network'
    | 'ScanSearch'
    | 'School'
    | 'Server'
    | 'Settings'
    | 'ShieldCheck'
    | 'Workflow';

export interface SkillContent extends Skill {
    icon: SkillIcon;
}

export interface SkillBranchContent {
    icon: SkillIcon;
    label: string;
}
