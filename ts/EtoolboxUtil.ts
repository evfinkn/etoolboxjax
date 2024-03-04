import type { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

import TexError from "mathjax-full/js/input/tex/TexError.js";

export * from "./Util.js";

export const ETOOLBOX_CMD_MAP = "etoolbox-commands";
export const LIST_PARSER_MAP = "etoolbox-list-parsers";

const flags: Record<string, boolean> = {};

export const Flag = {
  get(type: string, name: string): boolean {
    const bool = flags[`${type}-${name}`];
    if (bool !== undefined) return bool;

    throw new TexError("UndefinedFlag", `Undefined ${type} "${name}"`);
  },

  set(type: string, name: string, value: boolean): void {
    const key = `${type}-${name}`;
    if (flags[key] === undefined) {
      throw new TexError("UndefinedFlag", `Undefined ${type} "${name}"`);
    }
    flags[key] = value;
  },

  create(type: string, name: string, errorIfDefined: boolean = false): void {
    const key = `${type}-${name}`;
    if (flags[key] !== undefined) {
      if (errorIfDefined) {
        throw new TexError(
          "DuplicateFlag",
          `${type} "${name}" already defined`,
        );
      }
      return;
    }
    flags[key] = false;
  },
};

const list: Record<string, string[]> = {};

export const List = {
  get(name: string, errorIfUndefined: boolean = false): string[] {
    const items = list[name];
    if (items || !errorIfUndefined) return items;

    throw new TexError("UndefinedList", `Undefined list "${name}"`);
  },

  create(name: string, errorIfDefined: boolean = false): void {
    if (list[name] !== undefined) {
      if (errorIfDefined) {
        throw new TexError("DuplicateList", `List "${name}" already defined`);
      }
      return;
    }
    list[name] = [];
  },
};

export function GetList(parser: TexParser, name: string): string[] {
  const listName = parser.GetArgument(name);
  return List.get(listName);
}

export function ParseConditionsBranch(
  parser: TexParser,
  name: string,
  condition: boolean,
  negate: boolean = false,
): MmlNode {
  if (negate) condition = !condition;
  let branch: MmlNode;
  // GetArgument is used instead of ParseArg for the skipped branch so that
  // commands that cause side effects (like \newcommand) aren't executed
  if (condition) {
    branch = parser.ParseArg(name);
    parser.GetArgument(name); // Skip the false branch
  } else {
    parser.GetArgument(name); // Skip the true branch
    branch = parser.ParseArg(name);
  }
  return branch;
}

export function PushConditionsBranch(
  ...args: Parameters<typeof ParseConditionsBranch>
): void {
  args[0].Push(ParseConditionsBranch(...args));
}

/**
 * Separates a string into a list of strings using the given separator.
 * Whitespace after a separator is ignored. If an item starts with space or contains
 * the separator, it must be surrounded by braces. The braces are removed.
 * @param {string} str
 * @param {string} separator The separator to use. It can be multiple characters.
 * @returns {string[]}
 */
export function separateList(str: string, separator: string): string[] {
  const list: string[] = [];
  if (str.length === 0) return list;

  let item = "";
  let braces = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    if (char === "{" && (i === 0 || str.charAt(i - 1) !== "\\")) {
      braces++;
    } else if (char === "}" && (i === 0 || str.charAt(i - 1) !== "\\")) {
      braces--;
      if (braces < 0) {
        throw new TexError("ExtraCloseMissingOpen", "Extra close brace");
      }
    } else if (braces === 0 && str.startsWith(separator, i)) {
      list.push(item);
      item = "";
      // - 1 because i will be incremented when loop continues
      i += separator.length - 1; // skip separator
      const match = str.slice(i + 1).match(/^\s+/);
      if (match) {
        i += match[0].length; // skip whitespace after separator
      }
    } else {
      item += char;
    }
  }

  if (braces > 0) {
    throw new TexError("MissingCloseBrace", "Missing close brace");
  }

  list.push(item);
  return list;
}

export function isRomanNumeral(str: string): boolean {
  return /^(?:M*)(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/i.test(
    str,
  );
}

const romanNums: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

export function romanToNumber(str: string): number {
  str = str.toUpperCase();
  let sum = 0;
  let prev = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const current = romanNums[str[i]];
    sum += current < prev ? -current : current;
    prev = current;
  }
  return sum;
}

export * from "./CounterUtil.js";
