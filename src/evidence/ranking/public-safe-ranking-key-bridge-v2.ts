import { redactPublicText } from '../evidence-redactor.js';

/**
 * F2 侧 public-safe ranking key 投影。
 * 故意不 import `public-output/`，避免 production root → public-output 可达性违规。
 */
export interface RankingSafeKeyV2 {
  readonly file: string;
  readonly symbol: string;
}

/**
 * 保守投影：复用现网 redactPublicText，结果可作 ordering/membership key。
 */
export function projectRankingSafeKeyV2(input: {
  readonly file: string;
  readonly symbol?: string;
}): RankingSafeKeyV2 {
  return Object.freeze({
    file: redactPublicText(input.file).value,
    symbol: redactPublicText(input.symbol ?? '').value,
  });
}
