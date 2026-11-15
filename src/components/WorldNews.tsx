import { ChevronRight, X } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { calendarParts } from '../game/calendar';
import { worldNews } from '../game/society/news';
import type { GameState } from '../game/types';
import { SkillNavigationContext, SkillText } from './SkillText';
import styles from './WorldNews.module.css';
import { Modal } from './widgets';

type Headline = ReturnType<typeof worldNews>[number];

function newsDate(week: number) {
    const date = calendarParts(week, 0);
    return `${date.year}年${date.month}月`;
}

export function WorldNews({ game, speed }: { game: GameState; speed: number }) {
    const openSkill = useContext(SkillNavigationContext)!;
    const articles = useMemo(() => worldNews(game), [game]);
    const received = useRef(new Set<string>());
    const [queue, setQueue] = useState<Headline[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const opener = useRef<HTMLButtonElement>(null);
    const close = () => {
        setSelected(null);
        opener.current?.focus();
    };
    useEffect(() => {
        // 到着済みの記事は再登録せず、表示中に届いた記事も後ろで待たせる。
        const incoming = [...articles]
            .reverse()
            .filter((article) => !received.current.has(article.id));
        for (const article of incoming) received.current.add(article.id);
        if (incoming.length) setQueue((waiting) => [...waiting, ...incoming]);
    }, [articles]);
    const current = queue[0];
    const article = articles.find((item) => item.id === selected);
    return (
        <SkillNavigationContext
            value={(id) => {
                setSelected(null);
                openSkill(id);
            }}
        >
            <section className={styles.ticker} aria-label="ニュース" data-animation-speed={speed}>
                <h2>ニュース</h2>
                <div className={styles.window}>
                    {current && (
                        <p
                            key={current.id}
                            className={styles.headline}
                            style={{
                                animationDuration: `${Math.max(12, (current.title.length * 12 + 390) / 38)}s`,
                            }}
                            onAnimationEnd={() =>
                                setQueue((waiting) =>
                                    waiting[0]?.id === current.id ? waiting.slice(1) : waiting,
                                )
                            }
                        >
                            <SkillText>{current.title}</SkillText>
                        </p>
                    )}
                </div>
                <button
                    ref={opener}
                    type="button"
                    className={styles.open}
                    aria-label="ニュースの詳細を開く"
                    aria-haspopup="dialog"
                    disabled={!articles.length}
                    onClick={() => setSelected((current ?? articles[0]).id)}
                >
                    <ChevronRight size={17} aria-hidden="true" />
                </button>
            </section>
            {article && (
                <Modal
                    modal={false}
                    label="ニュースの詳細"
                    className={styles.reader}
                    onClose={close}
                >
                    <header className={styles.heading}>
                        <h2>ニュース</h2>
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="ニュースを閉じる"
                            onClick={close}
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </header>
                    <article className={styles.article}>
                        <p className={styles.meta}>
                            {newsDate(article.week)} · {article.region}
                        </p>
                        <h3>
                            <SkillText>{article.title}</SkillText>
                        </h3>
                        <p>
                            <SkillText>{article.summary}</SkillText>
                        </p>
                    </article>
                    {articles.length > 1 && (
                        <nav className={styles.archive} aria-label="これまでのニュース">
                            <h3>これまでのニュース</h3>
                            {articles.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-current={item.id === selected ? 'true' : undefined}
                                    onClick={() => setSelected(item.id)}
                                >
                                    <span>
                                        <small>
                                            {newsDate(item.week)} · {item.region}
                                        </small>
                                        {item.title}
                                    </span>
                                    <ChevronRight size={16} aria-hidden="true" />
                                </button>
                            ))}
                        </nav>
                    )}
                </Modal>
            )}
        </SkillNavigationContext>
    );
}
