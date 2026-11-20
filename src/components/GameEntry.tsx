import { useEffect, useState } from 'react';
import type { MapRegion } from '../map/types';
import { useGameStore } from '../state/gameStore';
import { useMapStore } from '../state/mapStore';
import { GameApp } from './GameApp';
import { LicensePage } from './LicensePage';

export function GameEntry({ regions }: { regions: MapRegion[] }) {
    const [atTitle, setAtTitle] = useState(!useGameStore.getState().game!.started);
    const [licensesOpen, setLicensesOpen] = useState(window.location.hash === '#licenses');
    useEffect(() => {
        const navigate = () => setLicensesOpen(window.location.hash === '#licenses');
        window.addEventListener('hashchange', navigate);
        return () => window.removeEventListener('hashchange', navigate);
    }, []);
    const returnToTitle = () => {
        const { seed, difficulty } = useGameStore.getState().game!;
        useGameStore.getState().initialize(seed + 1, difficulty);
        useMapStore.setState({ camera: { x: 0 }, selectedAreaId: null });
        setAtTitle(true);
    };
    return (
        <>
            <div
                style={{ visibility: licensesOpen ? 'hidden' : 'visible' }}
                inert={licensesOpen}
                aria-hidden={licensesOpen}
            >
                <GameApp
                    regions={regions}
                    atTitle={atTitle}
                    suspended={licensesOpen}
                    onBegin={() => setAtTitle(false)}
                    onReturnToTitle={returnToTitle}
                />
            </div>
            {licensesOpen && <LicensePage />}
        </>
    );
}
