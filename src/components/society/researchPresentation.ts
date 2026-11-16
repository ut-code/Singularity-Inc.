import { FlaskConical } from 'lucide-react';
import { researchTopic } from '../../game/research/system';
import type { ResearchProject } from '../../game/research/types';

export function researchPresentation(project: ResearchProject) {
    const topic = researchTopic(project);
    const color = topic.severity === 'high' ? 'var(--danger)' : 'var(--warning)';
    return {
        Icon: FlaskConical,
        label: topic.severity === 'high' ? '重要研究' : '研究',
        color,
        severity: topic.severity,
    };
}
