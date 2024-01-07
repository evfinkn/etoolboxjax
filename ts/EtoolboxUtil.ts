import type { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

import TexError from "mathjax-full/js/input/tex/TexError.js";

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
        const capType = type[0].toUpperCase() + type.slice(1);
        throw new TexError(
          "DuplicateFlag",
          `${capType} "${name}" already defined`,
        );
      }
      return;
    }
    flags[key] = false;
  },
};

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
  // use for-of str instead of for (let i = ...) because for-of str handles
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
