import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

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

export * from "./CounterUtil.js";
export * from "./EtoolboxUtil.js";
