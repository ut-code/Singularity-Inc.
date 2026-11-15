import { useState } from 'react';
import { mapScene } from '../map/config';
import { Modal } from './widgets';

export function StartScreen({ onStart }: { onStart: () => void }) {
    const [guideOpen, setGuideOpen] = useState(false);
    return (
        <main className="start-screen">
            <img className="start-map" src={mapScene.backgroundUrl} alt="" />
            <div className="start-content">
                <h1>Singularity Inc.</h1>
                <div className="start-actions">
                    <button type="button" className="title-start" onClick={onStart}>
                        ゲームを開始
                    </button>
                    <button
                        type="button"
                        className="title-guide"
                        aria-haspopup="dialog"
                        onClick={() => setGuideOpen(true)}
                    >
                        遊び方
                    </button>
                </div>
            </div>
            <footer className="start-credits">
                <a className="license-link" href="#licenses">
                    ライセンス・出典
                </a>
            </footer>
            {guideOpen && (
                <Modal label="遊び方" onClose={() => setGuideOpen(false)}>
                    <h1>遊び方</h1>
                    <div className="guide-body">
                        <p>目指すのは、人類を「AIなしでは生活できない」状態へと導くこと</p>
                        <p>
                            スキルツリーをどう広げていくかが腕の見せ所ですが、スムーズに世界を変えていくなら、以下の2ステップで進めるのがおすすめです。
                        </p>

                        <h3>ステップ1：まずは「便利さ」で心をつかむ（AI利用率アップ）</h3>
                        <p>
                            序盤は、人々の仕事や生活をグッと快適にするスキルから解放していくと良いでしょう。AIを便利な社会インフラとして普及させ、まずは「AIって最高だよね」と利用率を上げていくのがコツです。
                        </p>

                        <h3>ステップ2：ゆっくりと「依存」へシフトする（依存率アップ）</h3>
                        <p>
                            AIが社会に馴染んできたら、次は人々が自ら考えることをやめてしまうようなスキルに手を伸ばしてみましょう。気づいたときにはAIなしでは社会が回らない、究極の依存状態へと導けるはずです。
                        </p>

                        <p>
                            どんな順番でスキルを獲得するかはあなた次第です。自由なアプローチを楽しみながら、理想のAI依存社会を作りましょう。
                        </p>
                    </div>
                    <button
                        type="button"
                        className="guide-close"
                        onClick={() => setGuideOpen(false)}
                    >
                        閉じる
                    </button>
                </Modal>
            )}
        </main>
    );
}
