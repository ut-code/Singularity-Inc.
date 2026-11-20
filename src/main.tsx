import './map/rendering/tone.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameEntry } from './components/GameEntry';
import { StartupScreen } from './components/StartupScreen';
import { mapScene } from './map/config';
import { loadRegions } from './map/loadRegions';
import { useGameStore } from './state/gameStore';

const root = createRoot(document.getElementById('root')!);
// 地域データやReactの初期化を待たず、地図画像の取得を並行して始める。
for (const [name, url] of Object.entries(mapScene)) {
    if (name === 'regionsUrl') continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.append(link);
}
const titleLogo = new Image();
titleLogo.src = `${import.meta.env.BASE_URL}images/title-logo.webp`;
Promise.all([loadRegions(mapScene.regionsUrl), titleLogo.decode(), document.fonts.ready])
    .then(([regions]) => {
        useGameStore.getState().initialize();
        root.render(
            <StrictMode>
                <GameEntry regions={regions} />
            </StrictMode>,
        );
    })
    .catch((error: unknown) => {
        root.render(
            <StartupScreen error={error instanceof Error ? error.message : String(error)} />,
        );
    });
