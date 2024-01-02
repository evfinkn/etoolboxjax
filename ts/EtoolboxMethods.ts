import type { HandlerType } from "mathjax-full/js/input/tex/MapHandler.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";
import type { ParseMethod } from "mathjax-full/js/input/tex/Types.js";

import TexError from "mathjax-full/js/input/tex/TexError.js";

import * as Util from "./Util.js";

const EtoolboxMethods: Record<string, ParseMethod> = {};

const handlerTypes: HandlerType[] = [
  "macro",
  "delimiter",
  "character",
  "environment",
];

EtoolboxMethods.IfDef = function (
  parser: TexParser,
  name: string,
  negate: boolean,
) {
  const cs = Util.GetCsNameArgument(parser, name);
  const handlers = handlerTypes.map((type) =>
    parser.configuration.handlers.get(type),
  );
  const isDefined = handlers.some((handler) => handler.contains(cs));
  Util.PushConditionsBranch(parser, name, isDefined, negate);
};

EtoolboxMethods.IfStrEqual = function (parser: TexParser, name: string) {
  const str1 = parser.GetArgument(name);
  const str2 = parser.GetArgument(name);
  Util.PushConditionsBranch(parser, name, str1 === str2);
};

EtoolboxMethods.IfBlank = function (
  parser: TexParser,
  name: string,
  trim: boolean,
  negate: boolean,
) {
  let str = parser.GetArgument(name);
  if (trim) str = str.trim();

  Util.PushConditionsBranch(parser, name, str === "", negate);
};

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

EtoolboxMethods.IfNumComp = function (
  parser: TexParser,
  name: string,
  relationSym?: RelationSymbol,
) {
  const num1 = Util.numexpr(parser.GetArgument(name));
  if (!relationSym) {
    relationSym = parser.GetArgument(name) as RelationSymbol;
  }
  const num2 = Util.numexpr(parser.GetArgument(name));
  const relation = relations[relationSym];
  if (!relation) {
    throw new TexError("InvalidRelation", "Invalid relation: %1", relationSym);
  }
  Util.PushConditionsBranch(parser, name, relation(num1, num2));
};

EtoolboxMethods.IfNumParity = function (
  parser: TexParser,
  name: string,
  parity: 0 | 1,
) {
  const num = Util.numexpr(parser.GetArgument(name));
  Util.PushConditionsBranch(parser, name, num % 2 === parity);
};

export default EtoolboxMethods;
