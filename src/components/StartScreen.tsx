const images = `${import.meta.env.BASE_URL}images/`;

export function StartScreen({ onStart }: { onStart: () => void }) {
    return (
        <section className="start-screen" aria-label="タイトル">
            <div className="start-content">
                <h1>
                    <img
                        className="start-logo"
                        src={`${images}title-logo.webp`}
                        alt="Singularity Inc."
                        width="2555"
                        height="535"
                    />
                </h1>
                <div className="start-actions">
                    <button type="button" className="title-start" onClick={onStart}>
                        ゲームを開始
                    </button>
                </div>
            </div>
            <footer className="start-credits">
                <a className="license-link" href="#licenses">
                    ライセンス・出典
                </a>
            </footer>
        </section>
    );
}
