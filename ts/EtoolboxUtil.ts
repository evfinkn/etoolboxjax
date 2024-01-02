import type { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

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

export const COMMAND_MAP = "etoolbox-commands";
