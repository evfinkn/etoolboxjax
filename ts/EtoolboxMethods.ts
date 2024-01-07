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
  /**
   * Handles `\defcounter{<counter>}{<integer expression>}`.
   *
   * This evaluates `<integer expression>` with `\numexpr` and sets `<counter>` to the
   * result. If `<counter>` is undefined, an error is thrown.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   */
  DefCounter(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    counter.value = Util.numexpr(parser.GetArgument(name));
  },

  /**
   * Handles `\newbool`, `\newtoggle`, `\providebool`, and `\providetoggle`.
   *
   * Each command is called with a single argument, `<flag>`. If `<flag>` is undefined,
   * it is created with an initial value of false. Otherwise, `\newbool` and
   * `\newtoggle` throw an error while `\providebool` and `\providetoggle` do nothing.
   * A bool and a toggle can have the same name, but they are treated as separate flags.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {string} type The type of flag to define. This is used to distinguish
   *   between bools and toggles and should usually be either "bool" or "toggle".
   * @param {boolean} [errorIfDefined] Whether to throw an error if `<flag>` is already
   *   defined.
   */
  NewFlag(
    parser: TexParser,
    name: string,
    type: string,
    errorIfDefined: boolean,
  ) {
    const cs = Util.GetCsNameArgument(parser, name);
    Flag.create(type, cs, errorIfDefined);
  },

  /**
   * Handles commands related to changing the value of a flag.
   *
   * Specifically, this handles the following commands:
   *
   * - `\setbool{<flag>}{<value>}`
   * - `\booltrue{<flag>}`
   * - `\boolfalse{<flag>}`
   * - `\settoggle{<flag>}{<value>}`
   * - `\toggletrue{<flag>}`
   * - `\togglefalse{<flag>}`
   *
   * An error is thrown if `<flag>` is undefined. A bool and a toggle can have the same
   * name, but they are treated as separate flags. For `\setbool` and `\settoggle`,
   * `<value>` must be either `true` or `false`. Otherwise, an error is thrown.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {string} type The type of flag to set. This is used to distinguish
   *   between bools and toggles and should usually be either "bool" or "toggle".
   * @param {boolean} [value] The value to set the flag to. If undefined, the value is
   *   parsed from the TeX input.
   */
  SetFlag(parser: TexParser, name: string, type: string, value?: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    if (value === undefined) {
      const arg = parser.GetArgument(name);
      if (arg !== "true" && arg !== "false") {
        throw new TexError("InvalidFlag", `Invalid boolean value "${arg}"`);
      }
      value = arg === "true";
    }
    Flag.set(type, cs, value);
  },

  /**
   * Handles `\ifbool`, `\notbool`, `\iftoggle`, and `\nottoggle`.
   *
   * Each command is called with arguments `{<flag>}{<true>}{<false>}`. If `<flag>` is
   * true, the command expands to `<true>` and otherwise expands to `<false>`.
   * `\notbool` and `\nottoggle` are similar, but negated.
   *
   * If the given flag is undefined, an error is thrown. A bool and a toggle can have
   * the same name, but they are treated as separate flags.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {string} type The type of flag to check. This is used to distinguish
   *   between bools and toggles and should usually be either "bool" or "toggle".
   * @param {boolean} negate Whether to negate the result.
   */
  IfFlag(parser: TexParser, name: string, type: string, negate: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    const bool = Flag.get(type, cs);
    Util.PushConditionsBranch(parser, name, bool, negate);
  },

  /**
   * Handles `\ifdef`, `\ifcsdef`, `\ifundef`, and `\ifcsundef`.
   *
   * Each command is called with arguments `{<command>}{<true>}{<false>}`. If
   * `<command>` is defined, the command expands to `<true>` and otherwise expands to
   * `<false>`. `\ifundef` and `\ifcsundef` are similar, but negated.
   *
   * `\ifcsdef` and `\ifcsundef` are aliases for `\ifdef` and `\ifundef`, respectively.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {boolean} negate Whether to negate the result.
   */
  IfDef(parser: TexParser, name: string, negate: boolean) {
    const cs = Util.GetCsNameArgument(parser, name);
    const handlers = handlerTypes.map((type) =>
      parser.configuration.handlers.get(type),
    );
    const isDefined = handlers.some((handler) => handler.contains(cs));
    Util.PushConditionsBranch(parser, name, isDefined, negate);
  },

  /**
   * Handles `\ifdefmacro`, `\ifcsmacro`, `\ifdefparam`, and `\ifcsparam`.
   *
   * Each command is called with arguments `{<macro>}{<true>}{<false>}`. If `<macro>`
   * is defined and was defined with `\newcommand`, `\renewcommand`, `\def`, or `\let`,
   * the command expands to `<true>` and otherwise expands to `<false>`. For
   * `\ifdefparam` and `\ifcsparam`, `<macro>` has the additional restriction that it
   * must take at least one parameter.
   *
   * `\ifcsmacro` and `\ifcsparam` are aliases for `\ifdefmacro` and `\ifdefparam`,
   * respectively. See the documentation for EtoolboxMappings.EtoolboxCommandMap.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {boolean} [withParams] If true, `<macro>` must take at least one parameter.
   *   If false, `<macro>` must not take any parameters. If undefined, `<macro>` can
   *   take any number of parameters.
   */
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

  /**
   * Handles `\ifdefcounter`, `\ifcscounter`, and `\ifltxcounter`.
   *
   * Each command is called with arguments `{<counter>}{<true>}{<false>}`. If
   * `<counter>` is defined, the command expands to `<true>` and otherwise expands to
   * `<false>`.
   *
   * In `etoolbox`, `\ifdefcounter` checks if the control sequence `<counter>` is
   * defined with `\newcount` while `\ifltxcounter` checks if it's defined with
   * `\newcounter`. However, this package only supports `\newcounter`, so
   * `\ifdefcounter` and `\ifltxcounter` are equivalent. Additionally, `\ifcscounter`
   * is an alias for `\ifdefcounter`.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   */
  IfDefCounter(parser: TexParser, name: string) {
    const cs = Util.GetCsNameArgument(parser, name);
    const counter = Util.Counter.get(cs, false);
    Util.PushConditionsBranch(parser, name, !!counter);
  },

  /**
   * Handles `\ifstrequal{<string1>}{<string2>}{<true>}{<false>}`
   *
   * This expands to `<true>` if `<string1>` and `<string2>` are equal and `<false>`
   * otherwise. Neither string is expanded before comparison.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   */
  IfStrEqual(parser: TexParser, name: string) {
    const str1 = parser.GetArgument(name);
    const str2 = parser.GetArgument(name);
    Util.PushConditionsBranch(parser, name, str1 === str2);
  },

  /**
   * Handles `\ifstrempty`, `\ifblank`, and `\notblank`.
   *
   * Each command is called with arguments `{<string>}{<true>}{<false>}`.
   *
   * `\ifstrempty` checks if `<string>` is empty, `\ifblank` checks if `<string>` is
   * empty or only contains spaces, and `\notblank` is similar to `\ifblank` but
   * negated.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {boolean} trim Whether to trim whitespace from the string.
   * @param {boolean} negate Whether to negate the result.
   */
  IfBlank(parser: TexParser, name: string, trim: boolean, negate: boolean) {
    let str = parser.GetArgument(name);
    if (trim) str = str.trim();

    Util.PushConditionsBranch(parser, name, str === "", negate);
  },

  /**
   * Handles numeric-comparison-related conditionals.
   *
   * The general form is `\ifnumcomp{<num1>}{<relation>}{<num2>}{<true>}{<false>}`.
   * `<num1>` and `<num2>` are evaluated with `\numexpr` and compared using the given
   * relation. This expands to `<true>` if the relation is true and `<false>` otherwise.
   * `<relation>` can be one of `=`, `!=`, `<`, `>`, `<=`, or `>=`. If `<relation>`
   * isn't one of these, an error is thrown.
   *
   * The commands `\ifnumequal`, `\ifnumneq`, `\ifnumless`, `\ifnumgreater`,
   * `\ifnumleq`, and `\ifnumgeq` are aliases for `\ifnumcomp` with the corresponding
   * relation. These are called with arguments `{<num1>}{<num2>}{<true>}{<false>}`.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {RelationSymbol} [relationSym] The relation to use. If not given, it is
   *   parsed from the TeX input.
   */
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

  /**
   * Handles `\ifnumeven` and `\ifnumodd`.
   *
   * The commands are called with arguments `{<integer expression>}{<true>}{<false>}`.
   * `<integer expression>` is evaluated with `\numexpr`.
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {0 | 1} parity 0 for even, 1 for odd.
   */
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
