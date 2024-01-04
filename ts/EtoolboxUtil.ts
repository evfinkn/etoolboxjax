import type { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

import TexError from "mathjax-full/js/input/tex/TexError.js";

export const ETOOLBOX_CMD_MAP = "etoolbox-commands";

const flags: Record<string, boolean> = {};

export const Flag = {
  get(name: string): boolean {
    const bool = flags[name];
    if (bool !== undefined) return bool;

    throw new TexError("UndefinedFlag", `Undefined flag "${name}"`);
  },

  set(name: string, value: boolean): void {
    if (flags[name] === undefined) {
      throw new TexError("UndefinedFlag", `Undefined flag "${name}"`);
    }
    flags[name] = value;
  },

  create(name: string, errorIfDefined: boolean = false): void {
    if (errorIfDefined && flags[name] !== undefined) {
      throw new TexError("DuplicateFlag", `Flag "${name}" already defined`);
    }
    flags[name] = false;
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
