import { type LucideIcon, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { SkillText } from '../SkillText';
import type { MapLocation } from '../useMapAnchor';
import { Modal } from '../widgets';

export function IncidentPanelFrame({
    title,
    showTitle = true,
    heading,
    label,
    description,
    Icon,
    color,
    mapLocation,
    onClose,
    children,
}: {
    title: string;
    showTitle?: boolean;
    heading: string;
    label: string;
    description?: string;
    Icon: LucideIcon;
    color: string;
    mapLocation?: MapLocation;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <Modal modal={false} label={title} onClose={onClose} mapLocation={mapLocation}>
            <div className="investigation-panel">
                <div className="society-heading">
                    <div className="contact-heading">
                        <Icon size={28} style={{ color }} />
                        <div>
                            <span className="eyebrow">{label}</span>
                            <h2>{heading}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="icon-button"
                        aria-label="閉じる"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>
                {showTitle && <h2 className="investigation-title">{title}</h2>}
                {description && (
                    <p className="investigation-question">
                        <SkillText>{description}</SkillText>
                    </p>
                )}
                {children}
            </div>
        </Modal>
    );
}
