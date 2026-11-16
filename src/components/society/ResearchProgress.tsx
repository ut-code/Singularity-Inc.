import type { ResearchProject } from '../../game/research/types';
import { ContinuousProgress, useProjectedGame } from '../ContinuousProgress';

export function ResearchProgress({
    project,
    label,
    id,
    className,
}: {
    project: ResearchProject;
    label: string;
    id?: string;
    className?: string;
}) {
    const projected = useProjectedGame().researchProjects.find((item) => item.id === project.id);
    if (project.status !== 'active') return null;
    return (
        <ContinuousProgress
            id={id}
            label={label}
            value={project.progress}
            nextValue={projected?.progress ?? project.progress}
            max={100}
            className={className}
        />
    );
}
