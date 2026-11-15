import { FlaskConical, Scale } from 'lucide-react';
import { researchTopic } from '../../game/research/system';
import type { ResearchProject } from '../../game/research/types';

export function researchPresentation(project: ResearchProject) {
    const topic = researchTopic(project);
    if (topic.category === 'regulation')
        return { Icon: Scale, label: '法案', color: 'var(--warning)' };
    if ((topic.onPublish.refuse ?? 0) >= 0.07 || (topic.onPublish.trust ?? 0) <= -0.2)
        return { Icon: FlaskConical, label: '重要研究', color: 'var(--danger)' };
    return {
        Icon: FlaskConical,
        label: '研究',
        color: 'var(--warning)',
    };
}
