import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import { Macro } from "mathjax-full/js/input/tex/Token.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

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

/**
 * Gets the macro associated with a control sequence.
 * @param parser The current parser.
 * @param cs The control sequence to lookup.
 * @return The macro associated with the control sequence, or `undefined` if not found.
 */
export function getMacro(parser: TexParser, cs: string): Macro | undefined {
  const handlers = parser.configuration.handlers;
  const newCommands = handlers.retrieve("new-Command") as CommandMap;
  return newCommands.lookup(cs);
}
