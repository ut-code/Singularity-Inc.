export function StartupScreen({ error }: { error?: string | null }) {
    return (
        <section className="startup-screen" role={error ? 'alert' : 'status'} aria-busy={!error}>
            <div className="startup-content glass">
                <p>{error ? '読み込みに失敗しました。' : '読み込み中…'}</p>
                {error ? (
                    <>
                        <p className="startup-detail">{error}</p>
                        <button
                            type="button"
                            className="title-start"
                            onClick={() => location.reload()}
                        >
                            再読み込み
                        </button>
                    </>
                ) : (
                    <progress aria-label="読み込み状況" />
                )}
            </div>
        </section>
    );
}
