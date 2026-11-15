import { useGameStore } from '../state/gameStore';
import styles from './NotificationFeed.module.css';
import { SkillText } from './SkillText';
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
                    const Icon = presentation?.Icon;
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
                                    style={{ color: presentation!.color }}
                                    aria-hidden="true"
                                />
                            )}
                            <span title={item.text}>
                                <SkillText>{item.text}</SkillText>
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
