import { Bot, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { calendarParts } from '../../game/calendar';
import type { SocialPost } from '../../game/society/social';
import { useGameStore } from '../../state/gameStore';
import { SkillText } from '../SkillText';
import styles from './SocietyPanel.module.css';

function Post({ post }: { post: SocialPost }) {
    const date = calendarParts(post.week, 0);
    return (
        <article className={styles.post} aria-label={`${post.author.name}の投稿`}>
            <div className={styles.avatar} aria-hidden="true">
                <UserRound size={18} />
            </div>
            <div className={styles.postContent}>
                <header className={styles.postHeading}>
                    <strong>{post.author.name}</strong>
                    {post.intervention && (
                        <span
                            className={styles.intervention}
                            title="あなたが生成・拡散した投稿。この目印はプレイヤーにだけ表示されます。"
                        >
                            <Bot size={12} aria-hidden="true" />
                            介入
                        </span>
                    )}
                    <time
                        dateTime={`${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`}
                    >
                        {date.year}/{date.month}/{date.day}
                    </time>
                </header>
                <p>
                    <SkillText>{post.text}</SkillText>
                </p>
            </div>
        </article>
    );
}

export function SocietyPanel({ onClose }: { onClose: () => void }) {
    const posts = useGameStore((state) => state.socialFeed.posts);
    const [lastVisible, setLastVisible] = useState(posts[0]?.sequence ?? 0);
    const [following, setFollowing] = useState(true);
    const timeline = useRef<HTMLDivElement>(null);
    const newest = posts[0]?.sequence ?? 0;
    useEffect(() => {
        if (following) setLastVisible(newest);
    }, [following, newest]);
    const fresh = posts.filter((post) => post.sequence > lastVisible).length;
    return (
        <aside id="sns-panel" className={`sns-panel glass ${styles.panel}`} aria-label="世界の様子">
            <header className={styles.heading}>
                <h2>世界の様子</h2>
                <button
                    type="button"
                    className="icon-button"
                    aria-label="世界の様子を閉じる"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>
            </header>
            {fresh > 0 && (
                <button
                    type="button"
                    className={styles.newPosts}
                    onClick={() => {
                        setLastVisible(newest);
                        setFollowing(true);
                        timeline.current!.scrollTop = 0;
                    }}
                >
                    新しい投稿 {fresh}件
                </button>
            )}
            <div
                className={styles.timeline}
                ref={timeline}
                onScroll={(event) => setFollowing(event.currentTarget.scrollTop < 50)}
            >
                {posts
                    .filter((post) => post.sequence <= lastVisible)
                    .map((post) => (
                        <Post key={post.id} post={post} />
                    ))}
            </div>
        </aside>
    );
}
