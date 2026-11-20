import { FlaskConical } from 'lucide-react';
import { researchTopic } from '../../game/research/system';
import type { ResearchProject } from '../../game/research/types';

export function researchPresentation(project: ResearchProject) {
    const topic = researchTopic(project);
    const revealsIntent = topic.id === 'intent-decoding';
    return {
        Icon: FlaskConical,
        label: revealsIntent ? '重要研究' : '研究',
        color: revealsIntent ? 'var(--danger)' : 'var(--warning)',
        severity: revealsIntent ? 'high' : 'normal',
    };
}
