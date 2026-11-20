import { ArrowLeft, ArrowRight } from 'lucide-react';

export function EntryNavigation({
    onBack,
    onNext,
    nextLabel = '次へ',
    nextDisabled = false,
}: {
    onBack: () => void;
    onNext: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
}) {
    return (
        <nav className="entry-navigation" aria-label="ゲーム開始までの画面操作">
            <button type="button" className="title-guide" onClick={onBack}>
                <ArrowLeft size={18} aria-hidden="true" />
                戻る
            </button>
            <button type="button" className="title-start" disabled={nextDisabled} onClick={onNext}>
                {nextLabel}
                <ArrowRight size={18} aria-hidden="true" />
            </button>
        </nav>
    );
}
