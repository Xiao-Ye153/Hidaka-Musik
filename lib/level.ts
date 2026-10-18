export const MAX_LEVEL = 100;

export const levelPointReq = (n: number) => 20 + 15 * (n - 1);

export function computeLevelInfo(totalPoints: number) {
  let lvl = 1;
  let cum = 0;
  while (lvl < MAX_LEVEL) {
    const req = levelPointReq(lvl);
    if (totalPoints >= cum + req) {
      cum += req;
      lvl++;
    } else break;
  }
  const need = levelPointReq(Math.min(lvl, MAX_LEVEL - 1));
  return { level: lvl, into: Math.max(0, totalPoints - cum), need };
}
