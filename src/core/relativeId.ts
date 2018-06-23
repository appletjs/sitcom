import {relative} from 'path';

/**
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export default function relativeId(from: string, to: string): string {
  return relative(from, to);
}
