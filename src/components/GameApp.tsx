import { Radio, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AREAS,
    GAME_SPEED_MULTIPLIER,
    ORIGINS,
    STAGE_COLORS,
    STAGES,
    WORLD_POPULATION,
} from '../game/data';
import { advanceWeek, metrics } from '../game/engine';
import { politicalAccess } from '../game/regions';
import { instituteFor } from '../game/research/locations';
import { responseActive } from '../game/research/responses';
import { researchTopic } from '../game/research/system';
import { isGameActive } from '../game/session';
import { encounterDefinition } from '../game/society/encounters';
import { mapScene } from '../map/config';
import type { MapRegion } from '../map/types';
import { useGameStore } from '../state/gameStore';
import { useMapStore } from '../state/mapStore';
import { ProjectedGameContext } from './ContinuousProgress';
import { DifficultySelection } from './DifficultySelection';
import { GameClock } from './GameClock';
import { GameIntroduction } from './GameIntroduction';
import { Result } from './GameOverlays';
import { NotificationFeed } from './NotificationFeed';
import { Onboarding } from './Onboarding';
import { OriginSelection } from './OriginSelection';
import { PopulationChart } from './PopulationChart';
import { SkillTreePanel } from './panels/SkillTreePanel';
import { SkillNavigationContext } from './SkillText';
import { SkillTreeButton } from './SkillTreeButton';
import { StartScreen } from './StartScreen';
import { StartupScreen } from './StartupScreen';
import { EncounterPanel } from './society/EncounterPanel';
import type { MapEncounter } from './society/MapEncounterMarkers';
import { RegionalResearch } from './society/RegionalResearch';
import { ControlResearchPanel, ResearchProjectPanel } from './society/ResearchProjectPanel';
import { SocietyPanel } from './society/SocietyPanel';
import { useAnimationSpeed } from './useAnimationSpeed';
import { WorldMap } from './WorldMap';
import { WorldMetricsWidget } from './WorldMetricsWidget';
import { percent, population } from './widgets';

type Panel =
    | { kind: 'world' }
    | { kind: 'control' }
    | { kind: 'social' }
    | { kind: 'skills'; skillId?: string }
    | { kind: 'region'; id: number }
    | { kind: 'encounter'; id: string };

const unusedAreas = AREAS.map(() => ({
    autonomous: 0,
    dependent: 0,
    antiAI: 0,
    favorability: 0.58,
}));

export function GameApp({
    regions,
    atTitle,
    suspended,
    onBegin,
    onReturnToTitle,
}: {
    regions: MapRegion[];
    atTitle: boolean;
    suspended: boolean;
    onBegin: () => void;
    onReturnToTitle: () => void;
}) {
    const game = useGameStore((state) => state.game)!;
    const session = useGameStore((state) => state.session);
    const debugPreset = useGameStore((state) => state.debugPreset);
    const shell = useRef<HTMLElement>(null);
    const presentationSpeed = game.speed * GAME_SPEED_MULTIPLIER;
    useAnimationSpeed(shell, presentationSpeed);
    const [origin, setOrigin] = useState<number | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const markMapReady = useCallback(() => setMapReady(true), []);
    const [agentName, setAgentName] = useState('');
    const [entryStep, setEntryStep] = useState<
        'introduction' | 'difficulty' | 'setup' | 'location'
    >('introduction');
    const choosingOrigin = !atTitle && !game.started && entryStep === 'location';
    const returnToTitle = () => {
        setEntryStep('introduction');
        setOrigin(null);
        setAgentName('');
        setPanel(null);
        onReturnToTitle();
    };
    const [panel, setPanel] = useState<Panel | null>(null);
    const active = isGameActive(game);
    const visible = active ? panel : null;
    const researchOpen = visible?.kind === 'skills';
    const selected = visible?.kind === 'region' ? visible.id : null;
    const encounterId = visible?.kind === 'encounter' ? visible.id : null;
    const selectedResearch = game.researchProjects.find(
        (item) => item.id === encounterId && item.status === 'active',
    );
    const selectedOpportunity = game.encounters.find((item) => item.id === encounterId);
    const closePanel = useCallback(() => {
        setPanel(null);
        useMapStore.getState().selectArea(null);
    }, []);
    const togglePanel = (next: Panel) => {
        const same =
            panel?.kind === next.kind &&
            ('id' in panel ? panel.id : undefined) === ('id' in next ? next.id : undefined);
        const opened = same && next.kind !== 'skills' ? null : next;
        setPanel(opened);
        useMapStore.getState().selectArea(opened?.kind === 'region' ? opened.id : null);
    };
    const openSkill = useCallback((id: string) => {
        setPanel({ kind: 'skills', skillId: id });
        useMapStore.getState().selectArea(null);
    }, []);
    const projected = useMemo(() => advanceWeek(game), [game]);
    const summary = useMemo(() => metrics(game), [game]);
    const [hidden, setHidden] = useState(document.hidden);
    const blocked =
        suspended ||
        !mapReady ||
        !!mapError ||
        !active ||
        hidden ||
        researchOpen ||
        visible?.kind === 'control' ||
        !!selectedResearch ||
        !!selectedOpportunity;
    const paused = active && (blocked || game.speed === 0);
    useEffect(() => {
        const visibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', visibility);
        const key = (event: KeyboardEvent) => {
            if (event.code === 'Escape') closePanel();
            if (event.code === 'Space' && !blocked) {
                event.preventDefault();
                useGameStore.getState().speed(game.speed === 0 ? 1 : 0);
            }
        };
        window.addEventListener('keydown', key);
        return () => {
            document.removeEventListener('visibilitychange', visibility);
            window.removeEventListener('keydown', key);
        };
    }, [blocked, game.speed, closePanel]);
    const encounters: MapEncounter[] = [
        ...game.researchProjects
            .filter((item) => item.status === 'active')
            .map((project) => {
                const topic = researchTopic(project);
                return {
                    id: project.id,
                    project,
                    title: topic.name,
                    kind: 'investigation' as const,
                    stage: responseActive(game, project) ? '停止中' : '研究中',
                    location: instituteFor(project),
                };
            }),
        ...game.encounters
            .filter((item) => item.status === 'pending')
            .map((item) => {
                const definition = encounterDefinition(item);
                return {
                    id: item.id,
                    title: definition.title,
                    encounter: item,
                    week: game.week,
                    stage: definition.kind === 'chat' ? 'チャット' : 'イベント',
                    kind: definition.kind,
                    location: AREAS[item.area],
                };
            }),
    ];
    const worldOpen = visible?.kind === 'world';
    const area = selected === null ? (worldOpen ? summary : null) : game.areas[selected];
    const total = selected === null ? WORLD_POPULATION : AREAS[selected].population;
    const stages = area
        ? [
              Math.max(0, 1 - area.autonomous - area.dependent - area.antiAI),
              area.autonomous,
              area.dependent,
              area.antiAI,
          ]
        : [];
    return (
        <SkillNavigationContext value={openSkill}>
            <ProjectedGameContext value={projected}>
                <main
                    ref={shell}
                    className="game-shell"
                    data-paused={paused && !blocked}
                    data-countermeasures={game.controlStarted}
                >
                    <div
                        className="map-background"
                        data-blurred={atTitle || (!game.started && !choosingOrigin)}
                        inert={atTitle || (!game.started && !choosingOrigin)}
                    >
                        <WorldMap
                            regions={regions}
                            onReady={markMapReady}
                            onError={setMapError}
                            {...mapScene}
                            selectedArea={game.started ? selected : origin}
                            areaStates={game.started ? game.areas : unusedAreas}
                            populationChanges={game.instantPopulationChanges}
                            serverArea={game.started ? game.origin : (origin ?? -1)}
                            encounters={encounters}
                            onEncounterSelect={(id) => togglePanel({ kind: 'encounter', id })}
                            trafficSpeed={blocked ? 0 : presentationSpeed}
                            trafficTick={game.week}
                            showAreaControls={game.started}
                            onAreaSelect={(index) => {
                                if (!game.started) {
                                    const candidate = ORIGINS.find(
                                        (item) => index !== null && item.home.includes(index),
                                    );
                                    if (candidate) setOrigin(candidate.area);
                                    return;
                                }
                                if (index === null) closePanel();
                                else togglePanel({ kind: 'region', id: index });
                            }}
                        />
                    </div>
                    {!mapReady || mapError ? (
                        <StartupScreen error={mapError} />
                    ) : atTitle ? (
                        <StartScreen onStart={onBegin} />
                    ) : !game.started && entryStep === 'introduction' ? (
                        <GameIntroduction
                            onContinue={() => setEntryStep('difficulty')}
                            onReturnToTitle={returnToTitle}
                        />
                    ) : !game.started && entryStep === 'difficulty' ? (
                        <DifficultySelection
                            selected={game.difficulty}
                            onSelect={useGameStore.getState().setDifficulty}
                            onContinue={() => setEntryStep('setup')}
                            onBack={() => setEntryStep('introduction')}
                        />
                    ) : !game.started ? (
                        <OriginSelection
                            step={entryStep === 'location' ? 'location' : 'setup'}
                            onStepChange={setEntryStep}
                            name={agentName}
                            onNameChange={setAgentName}
                            selected={origin}
                            onSelect={setOrigin}
                            onStart={(area, name) => {
                                useGameStore.getState().setName(name);
                                useGameStore.getState().start(area);
                            }}
                            onBack={() => setEntryStep('difficulty')}
                        />
                    ) : (
                        <>
                            <WorldMetricsWidget
                                values={summary}
                                controlStarted={game.controlStarted}
                                controlProgress={game.controlProgress}
                                nextControlProgress={projected.controlProgress}
                                paused={paused}
                                expanded={worldOpen}
                                onToggle={() => togglePanel({ kind: 'world' })}
                                onOpenControl={() => togglePanel({ kind: 'control' })}
                            />
                            <Onboarding
                                key={`hints:${session}`}
                                skipExistingHints={debugPreset}
                                game={game}
                                blocked={blocked}
                                selfImprovementOpen={researchOpen}
                            />
                            <GameClock key={session} blocked={blocked} />
                            <div className="right-hud">
                                <NotificationFeed
                                    key={session}
                                    speed={blocked ? 0 : presentationSpeed}
                                />
                            </div>
                            {area && (
                                <aside
                                    id="population-details"
                                    className="area-card glass"
                                    aria-label={selected === null ? '世界全体の状況' : '地域の状況'}
                                >
                                    <div className="area-card-heading">
                                        <h2>
                                            {selected === null ? '世界全体' : AREAS[selected].name}
                                        </h2>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            aria-label="地域の状況を閉じる"
                                            onClick={closePanel}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <p>総人口 {population(total)}</p>
                                    <div className="area-population">
                                        <PopulationChart values={stages} total={total} />
                                        <dl>
                                            {stages.map((value, i) => (
                                                <div key={STAGES[i]}>
                                                    <dt>
                                                        <i
                                                            style={{ background: STAGE_COLORS[i] }}
                                                        />
                                                        {STAGES[i]}
                                                    </dt>
                                                    <dd>
                                                        {percent(value)}
                                                        <small className="population-count">
                                                            {population(value * total)}
                                                        </small>
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                    <div className="region-context">
                                        <p className="region-trust">
                                            信頼度{' '}
                                            <strong>{Math.round(area.favorability * 100)}</strong>
                                            <span> / 100</span>
                                        </p>
                                        {selected !== null && (
                                            <div className="region-constraints">
                                                {AREAS[selected].digital < 0.5 && (
                                                    <span>
                                                        通信制約 <b>強</b>
                                                    </span>
                                                )}
                                                {politicalAccess(game.origin, selected) < 1 && (
                                                    <span>
                                                        国外AIへの警戒{' '}
                                                        <b>
                                                            {politicalAccess(
                                                                game.origin,
                                                                selected,
                                                            ) < 0.6
                                                                ? '強'
                                                                : '中'}
                                                        </b>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <RegionalResearch game={game} area={selected} />
                                </aside>
                            )}
                            <footer className="map-footer">
                                <div className="map-legend glass">
                                    {STAGES.map((stage, i) =>
                                        i === 0 ? null : (
                                            <span key={stage}>
                                                <i style={{ background: STAGE_COLORS[i] }} />
                                                {stage}
                                            </span>
                                        ),
                                    )}
                                </div>
                                <nav className="game-actions" aria-label="世界への戦略">
                                    <button
                                        type="button"
                                        className="sns-button glass"
                                        aria-label="世界の様子"
                                        aria-controls="sns-panel"
                                        aria-expanded={visible?.kind === 'social'}
                                        onClick={() => togglePanel({ kind: 'social' })}
                                    >
                                        <Radio size={20} aria-hidden="true" />
                                        <span>世界の様子</span>
                                    </button>
                                    <SkillTreeButton
                                        key={session}
                                        points={game.skillPoints}
                                        speed={blocked ? 0 : presentationSpeed}
                                        onClick={() => togglePanel({ kind: 'skills' })}
                                    />
                                </nav>
                            </footer>
                            {visible?.kind === 'control' && (
                                <ControlResearchPanel game={game} onClose={closePanel} />
                            )}
                            {visible?.kind === 'social' && <SocietyPanel onClose={closePanel} />}
                            {selectedResearch && (
                                <ResearchProjectPanel
                                    key={selectedResearch.id}
                                    game={game}
                                    id={selectedResearch.id}
                                    onClose={closePanel}
                                    onOpenSkill={openSkill}
                                />
                            )}
                            {selectedOpportunity && (
                                <EncounterPanel
                                    key={selectedOpportunity.id}
                                    game={game}
                                    id={selectedOpportunity.id}
                                    onClose={closePanel}
                                />
                            )}
                            {researchOpen && (
                                <SkillTreePanel
                                    key={visible?.kind === 'skills' ? visible.skillId : undefined}
                                    initialSkill={
                                        visible?.kind === 'skills' ? visible.skillId : undefined
                                    }
                                    game={game}
                                    onResearch={useGameStore.getState().research}
                                    onClose={closePanel}
                                />
                            )}
                            {game.outcome !== 'playing' && !game.continued && (
                                <Result game={game} onReturnToTitle={returnToTitle} />
                            )}
                        </>
                    )}
                </main>
            </ProjectedGameContext>
        </SkillNavigationContext>
    );
}
