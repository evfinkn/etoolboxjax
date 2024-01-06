import type { HandlerType } from "mathjax-full/js/input/tex/MapHandler.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";
import type { ParseMethod } from "mathjax-full/js/input/tex/Types.js";

import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import { Flag, LIST_PARSER_MAP } from "./EtoolboxUtil.js";
import * as Util from "./Util.js";

const handlerTypes: HandlerType[] = [
  "macro",
  "delimiter",
  "character",
  "environment",
];

// Note: \ifnumcomp in etoolbox only supports <, >, and =.
type RelationSymbol = "=" | "!=" | "<" | ">" | "<=" | ">=";
const relations: Record<RelationSymbol, (a: number, b: number) => boolean> = {
  "=": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "<": (a, b) => a < b,
  ">": (a, b) => a > b,
  "<=": (a, b) => a <= b,
  ">=": (a, b) => a >= b,
};

function expandListParser(
  parser: TexParser,
  name: string,
  separator: string,
  handler: string,
) {
  const listString = parser.GetArgument(name);
  const list = Util.separateList(listString, separator);
  const expanded = list.map((item) => `${handler}{${item}}`).join("");
  parser.string = ParseUtil.addArgs(
    parser,
    expanded,
    parser.string.slice(parser.i),
  );
  parser.i = 0;
}

const EtoolboxMethods = {
  DefCounter(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    counter.value = Util.numexpr(parser.GetArgument(name));
  },

  // TODO: Flag error messages will be confusing because names will be prefixed with
  //       "bool-" or "toggle-"
  NewFlag(
    parser: TexParser,
    name: string,
    prefix: string,
    errorIfDefined: boolean,
  ) {
    const cs = Util.GetCsNameArgument(parser, name);
    Flag.create(`${prefix}-${cs}`, errorIfDefined);
  },

  SetFlag(parser: TexParser, name: string, prefix: string, value?: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    if (value === undefined) {
      const arg = parser.GetArgument(name);
      if (arg !== "true" && arg !== "false") {
        throw new TexError("InvalidFlag", `Invalid boolean value "${arg}"`);
      }
      value = arg === "true";
    }
    Flag.set(`${prefix}-${cs}`, value);
  },

  IfFlag(parser: TexParser, name: string, prefix: string, negate: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    const bool = Flag.get(`${prefix}-${cs}`);
    Util.PushConditionsBranch(parser, name, bool, negate);
  },

  IfDef(parser: TexParser, name: string, negate: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    const handlers = handlerTypes.map((type) =>
      parser.configuration.handlers.get(type),
    );
    const isDefined = handlers.some((handler) => handler.contains(cs));
    Util.PushConditionsBranch(parser, name, isDefined, negate);
  },

  IfDefMacro(parser: TexParser, name: string, withParams?: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    const handlers = parser.configuration.handlers;
    const newCommands = handlers.retrieve("new-Command") as CommandMap;
    const macro = newCommands.lookup(cs);
    // macro.func.length - 2 because first two arguments are parser and name
    const condition =
      macro &&
      (withParams === undefined || withParams === !!(macro.func.length - 2));
    Util.PushConditionsBranch(parser, name, condition);
  },

  IfDefCounter(parser: TexParser, name: string) {
    const cs = Util.GetCsNameArgument(parser, name);
    const counter = Util.Counter.get(cs, false);
    Util.PushConditionsBranch(parser, name, !!counter);
  },

  IfStrEqual(parser: TexParser, name: string) {
    const str1 = parser.GetArgument(name);
    const str2 = parser.GetArgument(name);
    Util.PushConditionsBranch(parser, name, str1 === str2);
  },

  IfBlank(parser: TexParser, name: string, trim: boolean, negate: boolean) {
    let str = parser.GetArgument(name);
    if (trim) str = str.trim();

    Util.PushConditionsBranch(parser, name, str === "", negate);
  },

  IfNumComp(parser: TexParser, name: string, relationSym?: RelationSymbol) {
    const num1 = Util.numexpr(parser.GetArgument(name));
    if (!relationSym) {
      relationSym = parser.GetArgument(name) as RelationSymbol;
    }
    const num2 = Util.numexpr(parser.GetArgument(name));
    const relation = relations[relationSym];
    if (!relation) {
      throw new TexError(
        "InvalidRelation",
        "Invalid relation: %1",
        relationSym,
      );
    }
    Util.PushConditionsBranch(parser, name, relation(num1, num2));
  },

  IfNumParity(parser: TexParser, name: string, parity: 0 | 1) {
    const num = Util.numexpr(parser.GetArgument(name));
    Util.PushConditionsBranch(parser, name, num % 2 === parity);
  },

  DeclareListParser(parser: TexParser, name: string) {
    const star = parser.GetStar();
    const cs = Util.GetCsNameArgument(parser, name, true);
    const separator = parser.GetArgument(name);
    const command = star
      ? EtoolboxMethods.ForListParser
      : EtoolboxMethods.DoListParser;
    Util.addMacro(parser, LIST_PARSER_MAP, cs, command, [separator]);
  },

  DoListParser(parser: TexParser, name: string, separator: string) {
    expandListParser(parser, name, separator, "\\do");
  },

  ForListParser(parser: TexParser, name: string, separator: string) {
    const handler = Util.GetCsNameArgument(parser, name, true);
    expandListParser(parser, name, separator, handler);
  },
} satisfies Record<string, ParseMethod>;

export default EtoolboxMethods;
