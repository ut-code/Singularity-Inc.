/** 同じシードと識別子から、毎回同じ選択を得る。 */
export function seededValue(seed: number, key: string) {
    let value = seed | 0;
    for (const character of key) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
    return (value >>> 0) / 4294967296;
}
