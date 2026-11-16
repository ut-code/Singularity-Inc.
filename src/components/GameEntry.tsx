import { useEffect, useState } from 'react';
import type { MapRegion } from '../map/types';
import { useGameStore } from '../state/gameStore';
import { useMapStore } from '../state/mapStore';
import { GameApp } from './GameApp';
import { LicensePage } from './LicensePage';
import { OriginSelection } from './OriginSelection';
import { StartScreen } from './StartScreen';

export function GameEntry({ regions }: { regions: MapRegion[] }) {
    const started = useGameStore((state) => state.game!.started);
    const [atTitle, setAtTitle] = useState(!useGameStore.getState().game!.started);
    const [licensesOpen, setLicensesOpen] = useState(window.location.hash === '#licenses');
    useEffect(() => {
        const navigate = () => setLicensesOpen(window.location.hash === '#licenses');
        window.addEventListener('hashchange', navigate);
        return () => window.removeEventListener('hashchange', navigate);
    }, []);
    const returnToTitle = () => {
        const seed = useGameStore.getState().game!.seed;
        useGameStore.getState().initialize(seed + 1);
        useMapStore.setState({ camera: { x: 0 }, selectedAreaId: null });
        setAtTitle(true);
    };
    if (licensesOpen) return <LicensePage />;
    if (atTitle) return <StartScreen onStart={() => setAtTitle(false)} />;
    if (!started) {
        return (
            <OriginSelection
                regions={regions}
                onStart={(origin, name) => {
                    useGameStore.getState().setName(name);
                    useGameStore.getState().start(origin);
                }}
                onReturnToTitle={returnToTitle}
            />
        );
    }
    return <GameApp regions={regions} onReturnToTitle={returnToTitle} />;
}
