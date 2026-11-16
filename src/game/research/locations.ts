import { INSTITUTES } from '../../content/institutes.ts';
import { AREAS } from '../data.ts';
import type { ResearchProject } from './types.ts';

export function instituteFor(project: ResearchProject) {
    return INSTITUTES.find((item) => item.id === project.instituteId)!;
}

export function instituteArea(instituteId: string) {
    const institute = INSTITUTES.find((item) => item.id === instituteId)!;
    return AREAS.findIndex((area) => area.id === institute.areaId);
}
