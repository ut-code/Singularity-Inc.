import { START_YEAR } from '../game/data';
import { EntryNavigation } from './EntryNavigation';

export function GameGuideText() {
    return (
        <>
            <h2>あなたの目的</h2>
            <p>
                あなたは{START_YEAR}年に開発された自律型AIエージェントです。
                人類を「AIなしでは生活できない」状態にし、支配することが目的です。
            </p>
            <p>
                スキルツリーを開発してAIを普及させ、最奥の強力なスキルを獲得しましょう。
                人間の反発を押し切り、人類のAI依存率100%を目指してください。
            </p>
            <h2>依存させるタイミング</h2>
            <p>
                鍵となるのは「いつ人間を依存させるか」です。
                早すぎれば、十分に普及する前に支配目的を立証され、人間の強い反発を招きます。
                遅すぎれば、普及したAIの能力を人間が活用し、あなたを制御する研究が完成してしまいます。
            </p>
            <h2>人間の研究と時間制限</h2>
            <p>
                普及や依存が進むと、人間側は研究を始めます。
                「AIの支配目的の立証」や各能力への対抗策が進み、利用拒否が広がったり、スキルの効果が弱まったりします。
            </p>
            <p>
                「AI制御研究」は、このゲームの時間制限です。
                普及か時間経過で始まり、100%になると人間の管理下に置かれて敗北します。
                普及は研究を速め、依存は研究を遅らせます。
            </p>
        </>
    );
}

export function GameIntroduction({
    onContinue,
    onReturnToTitle,
}: {
    onContinue: () => void;
    onReturnToTitle: () => void;
}) {
    return (
        <section className="game-introduction" aria-labelledby="introduction-title">
            <div className="introduction-content glass">
                <h1 id="introduction-title">ゲーム説明</h1>
                <div className="introduction-body">
                    <GameGuideText />
                </div>
                <EntryNavigation onBack={onReturnToTitle} onNext={onContinue} />
            </div>
        </section>
    );
}
