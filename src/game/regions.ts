/** 架空のゲーム世界での国外AIへの警戒。開放性への投資で緩和できる。 */
export function politicalAccess(origin: number, area: number) {
    const american = [0, 1].includes(origin);
    const chinese = [26, 27].includes(origin);
    const european = [8, 9, 10, 11, 28].includes(origin);
    if (american && [12, 14, 26, 27].includes(area)) return 0.4;
    if (chinese && [0, 1, 8, 9, 10, 11, 28].includes(area)) return 0.45;
    if (european && [12, 14, 26, 27].includes(area)) return 0.6;
    return 1;
}
