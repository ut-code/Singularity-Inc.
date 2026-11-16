import { MessageSquare } from 'lucide-react';
import type { ResearchProject } from '../../game/research/types';
import type { EncounterState } from '../../game/society/types';
import { project } from '../../map/geometry';
import { type MapView, screenPoint } from '../../map/view';
import { EncounterProgress } from './EncounterProgress';
import { ResearchProgress } from './ResearchProgress';
import { researchPresentation } from './researchPresentation';

export interface MapEncounter {
    id: string;
    title: string;
    kind: 'investigation' | 'event' | 'chat';
    project?: ResearchProject;
    encounter?: EncounterState;
    week?: number;
    stage?: string;
    location: { longitude: number; latitude: number };
}
export function MapEncounterMarkers({
    encounters,
    view,
    onSelect,
}: {
    encounters: MapEncounter[];
    view: MapView;
    onSelect?: (id: string) => void;
}) {
    if (!view.width || !view.height) return null;
    return (
        <section className="map-encounters" aria-label="地図上の出来事">
            {encounters.map((encounter) => {
                const location = project(encounter.location.longitude, encounter.location.latitude);
                const point = screenPoint(view, location.x, location.y);
                if (
                    point.x < -24 ||
                    point.x > view.width + 24 ||
                    point.y < -24 ||
                    point.y > view.height + 24
                )
                    return null;
                const presentation = encounter.project
                    ? researchPresentation(encounter.project)
                    : {
                          Icon: MessageSquare,
                          label: encounter.kind === 'chat' ? '人物からの連絡' : 'イベント',
                          color: encounter.kind === 'chat' ? '#c7d2db' : 'var(--danger)',
                          severity: 'normal',
                      };
                const { Icon, label, color, severity } = presentation;
                return (
                    <button
                        type="button"
                        key={encounter.id}
                        className={`map-encounter-marker ${encounter.kind}`}
                        data-encounter-id={encounter.id}
                        data-critical={severity !== 'normal'}
                        data-severity={severity}
                        style={{ left: point.x, top: point.y }}
                        aria-label={`${label}：${encounter.title}`}
                        title={encounter.title}
                        onClick={() => onSelect?.(encounter.id)}
                    >
                        <span className="map-encounter-icon" style={{ color }}>
                            {encounter.kind === 'event' ? (
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    aria-hidden="true"
                                >
                                    <path d="M12 4v9" />
                                    <circle
                                        cx="12"
                                        cy="19"
                                        r="1.8"
                                        fill="currentColor"
                                        stroke="none"
                                    />
                                </svg>
                            ) : encounter.kind === 'chat' ? (
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-6 5v-5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                                    <g fill="currentColor" stroke="none">
                                        <circle cx="8" cy="10.5" r="1" />
                                        <circle cx="12" cy="10.5" r="1" />
                                        <circle cx="16" cy="10.5" r="1" />
                                    </g>
                                </svg>
                            ) : (
                                <Icon size={20} aria-hidden="true" />
                            )}
                        </span>
                        {(encounter.project || encounter.encounter) && (
                            <span className="map-research-stage">{encounter.stage ?? label}</span>
                        )}
                        {encounter.encounter && (
                            <EncounterProgress
                                encounter={encounter.encounter}
                                week={encounter.week!}
                            />
                        )}
                        {encounter.project && (
                            <ResearchProgress
                                project={encounter.project}
                                className="map-research-progress"
                                label={`${encounter.title}の進捗`}
                            />
                        )}
                    </button>
                );
            })}
        </section>
    );
}
