import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";

export type NonParseParams<F> = F extends (
  parser: TexParser,
  name: string,
  ...args: infer R
) => any
  ? R
  : never;

export type CommandMapValue<T, K extends keyof T> =
  | K
  | [K, ...NonParseParams<T[K]>];

export type CommandMapRecord<T> = Record<string, CommandMapValue<T, keyof T>>;

export function replaceParserSlice(
  parser: TexParser,
  start: number,
  stop: number,
  replacement: string,
) {
  const left = parser.string.slice(0, start);
  const right = parser.string.slice(stop);

  // Use addArgs because it handles adding a space when the original string
  // ends with a control sequence and the replacement starts with a letter.
  const string = ParseUtil.addArgs(parser, left, replacement);
  parser.string = ParseUtil.addArgs(parser, string, right);

  ParseUtil.checkMaxMacros(parser);
}
