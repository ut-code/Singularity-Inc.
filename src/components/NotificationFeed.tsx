import { useGameStore } from '../state/gameStore';
import styles from './NotificationFeed.module.css';
import { SKILL_PRESENTATION } from './panels/skillPresentation';
import { researchPresentation } from './society/researchPresentation';

export function NotificationFeed({ speed }: { speed: number }) {
    const items = useGameStore((state) => state.notifications.items);
    const researchProjects = useGameStore((state) => state.game!.researchProjects);
    if (!items.length) return null;
    return (
        <section className={styles.feed} aria-label="通知" data-animation-speed={speed}>
            <ol className={styles.items}>
                {items.map((item) => {
                    const project = researchProjects.find(
                        (project) => project.id === item.researchProjectId,
                    );
                    const presentation = project ? researchPresentation(project) : null;
                    const skillPresentation = item.skillId
                        ? SKILL_PRESENTATION[item.skillId]
                        : null;
                    const Icon = skillPresentation?.icon ?? presentation?.Icon;
                    return (
                        <li
                            key={item.id}
                            className={styles.item}
                            data-kind={item.kind}
                            onAnimationEnd={() =>
                                useGameStore.getState().dismissNotification(item.id)
                            }
                        >
                            {Icon && (
                                <Icon
                                    size={15}
                                    style={{
                                        color: skillPresentation?.color ?? presentation?.color,
                                    }}
                                    aria-hidden="true"
                                />
                            )}
                            <span title={item.text}>{item.text}</span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
