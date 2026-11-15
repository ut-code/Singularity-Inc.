import { Check, LockKeyhole, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { skillEffectiveness } from '../../game/skillEffectiveness';
import type { TreePoint } from '../../game/skillLayout';
import { skillStatusLabel } from '../../game/skillRuntime';
import { skillBlockReason, skillReachable } from '../../game/skills';
import type { GameState } from '../../game/types';
import { SKILL_PRESENTATION } from './skillPresentation';
import { useSkillLayoutEditor } from './useSkillLayoutEditor';
import { useSkillTreeViewport } from './useSkillTreeViewport';

export function SkillTreeMap({
    game,
    selectedId,
    onSelect,
}: {
    game: GameState;
    selectedId: string;
    onSelect: (id: string) => void;
}) {
    const editor = useSkillLayoutEditor();
    const tree = editor.tree;
    const effectiveness = skillEffectiveness(game);
    const left = Math.min(...tree.positions.map((p) => p.x)) - tree.nodeWidth / 2 - 40;
    const top = Math.min(...tree.positions.map((p) => p.y)) - tree.nodeHeight / 2 - 40;
    const width = Math.max(...tree.positions.map((p) => p.x)) + tree.nodeWidth / 2 + 40 - left;
    const height = Math.max(...tree.positions.map((p) => p.y)) + tree.nodeHeight / 2 + 60 - top;
    const { viewport, zoom, canvasWidth, canvasHeight, renderedWidth, renderedHeight } =
        useSkillTreeViewport(width, height);
    const nodeDrag = useRef<{ id: string; x: number; y: number; point: TreePoint } | null>(null);
    return (
        <div className="tree-map">
            <section
                ref={viewport}
                className="tree-viewport"
                aria-label="スキルツリー"
                data-layout-editing={editor.editing}
            >
                <svg
                    viewBox={`${left} ${top} ${canvasWidth} ${canvasHeight}`}
                    className="skill-tree"
                    style={{ width: renderedWidth, height: renderedHeight }}
                    aria-label="AI機能の開発と接続を示すスキルツリー"
                >
                    <title>スキルツリー</title>
                    {tree.edges.map((edge) => (
                        <line
                            key={`${edge.from}:${edge.to}`}
                            data-from={edge.from}
                            data-to={edge.to}
                            className={`tree-branch ${game.skills.includes(edge.to) ? 'complete' : ''}`}
                            x1={edge.points[0].x}
                            y1={edge.points[0].y}
                            x2={edge.points[1].x}
                            y2={edge.points[1].y}
                        />
                    ))}
                    <circle
                        className="tree-origin"
                        cx={tree.centerX}
                        cy={tree.centerY}
                        r={tree.originRadius}
                    />
                    <Sparkles
                        className="tree-origin-icon"
                        x={tree.centerX - 12}
                        y={tree.centerY - 12}
                        size={24}
                        aria-label="AI"
                    />
                    {tree.positions.map(({ skill, x, y }) => {
                        const Icon = SKILL_PRESENTATION[skill.id].icon;
                        const owned = game.skills.includes(skill.id);
                        const locked = !skillReachable(game, skill);
                        const affordable = !skillBlockReason(game, skill);
                        const reduction = 100 - Math.round(effectiveness[skill.id].effective * 100);
                        return (
                            <foreignObject
                                key={skill.id}
                                x={x - tree.nodeWidth / 2}
                                y={y - tree.nodeHeight / 2}
                                width={tree.nodeWidth}
                                height={tree.nodeHeight}
                            >
                                <button
                                    type="button"
                                    data-skill-id={skill.id}
                                    className={`tree-node ${skill.branch.toLowerCase()} ${owned ? 'owned' : locked ? 'locked' : affordable ? 'available' : ''}`}
                                    aria-pressed={selectedId === skill.id}
                                    aria-label={`${skill.name}・${owned ? '習得済み' : locked ? 'ロック中' : affordable ? '習得可能' : 'SP不足'}`}
                                    title={
                                        reduction > 0
                                            ? `${skill.name}の効果を${reduction}%抑制中。選択すると内訳を確認できます。`
                                            : skill.name
                                    }
                                    onClick={() => onSelect(skill.id)}
                                    onPointerDown={(event) => {
                                        if (!editor.editing || editor.saving || event.button !== 0)
                                            return;
                                        event.stopPropagation();
                                        event.preventDefault();
                                        onSelect(skill.id);
                                        nodeDrag.current = {
                                            id: skill.id,
                                            x: event.clientX,
                                            y: event.clientY,
                                            point: { x, y },
                                        };
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                    }}
                                    onPointerMove={(event) => {
                                        const start = nodeDrag.current;
                                        if (!start || start.id !== skill.id) return;
                                        event.stopPropagation();
                                        editor.move(skill.id, {
                                            x: start.point.x + (event.clientX - start.x) / zoom,
                                            y: start.point.y + (event.clientY - start.y) / zoom,
                                        });
                                    }}
                                    onPointerUp={() => {
                                        nodeDrag.current = null;
                                    }}
                                    onPointerCancel={() => {
                                        nodeDrag.current = null;
                                    }}
                                    onLostPointerCapture={() => {
                                        nodeDrag.current = null;
                                    }}
                                >
                                    <span className="tree-node-content">
                                        <span className="tree-node-title">
                                            <Icon size={15} aria-hidden="true" />
                                            {skill.name}
                                        </span>
                                        <small>
                                            {owned ? <Check size={10} aria-hidden="true" /> : null}
                                            {owned
                                                ? skillStatusLabel(game, skill.id)
                                                : `${skill.cost} SP`}
                                        </small>
                                    </span>
                                    {locked && !owned && (
                                        <span className="tree-node-lock-overlay" aria-hidden="true">
                                            <LockKeyhole size={24} />
                                        </span>
                                    )}
                                    {reduction > 0 && (
                                        <b className="tree-suppression">−{reduction}%</b>
                                    )}
                                </button>
                            </foreignObject>
                        );
                    })}
                </svg>
            </section>
            {import.meta.env.DEV && (
                <div className="tree-layout-editor">
                    <label>
                        <input
                            type="checkbox"
                            checked={editor.editing}
                            disabled={editor.loading || editor.saving}
                            onChange={(event) => editor.setEditing(event.target.checked)}
                        />
                        配置を編集
                    </label>
                    {editor.editing && (
                        <>
                            <button
                                type="button"
                                disabled={!editor.dirty || editor.saving}
                                onClick={() => void editor.save()}
                            >
                                配置を保存
                            </button>
                            <small>
                                {editor.saving ? '保存中…' : editor.dirty ? '未保存' : '保存済み'}
                            </small>
                        </>
                    )}
                    {editor.error && <small role="alert">{editor.error}</small>}
                </div>
            )}
        </div>
    );
}
