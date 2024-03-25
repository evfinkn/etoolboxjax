import type { HandlerType } from "mathjax-full/js/input/tex/MapHandler.js";
import type { StackItem } from "mathjax-full/js/input/tex/StackItem.js";
import type TexParser from "mathjax-full/js/input/tex/TexParser.js";
import type { ParseMethod } from "mathjax-full/js/input/tex/Types.js";

import TexError from "mathjax-full/js/input/tex/TexError.js";

import * as Util from "./EtoolboxUtil.js";
import { Flag, LIST_PARSER_MAP } from "./EtoolboxUtil.js";

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

function expandLoop(
  parser: TexParser,
  startI: number,
  code: string | string[],
): StackItem {
  if (typeof code !== "string") code = code.join("");
  const expanded = `${code}\\loopbreak\\loopend`;
  Util.replaceParserSlice(parser, startI, parser.i, expanded);
  parser.i = startI;

  // The old way stored stopI in the loop item, which LoopBreak would use to set
  // parser.i. However, this doesn't work because the handler in the loop is likely
  // to be expanded (since it's usually a macro), which changes the value of parser.i.
  // Instead, we add \\loopend at the end of the expanded loop and skip to it
  // in LoopBreak.
  return parser.itemFactory.create("loop");
}

function expandListLoop(
  parser: TexParser,
  startI: number,
  list: string[],
  handler: string,
): ReturnType<typeof expandLoop> {
  const handledList = list.map((e) => `${handler}{${e}}`);
  return expandLoop(parser, startI, handledList);
}

function expandWhileLoop(
  parser: TexParser,
  startI: number,
  code: string,
  conditional: string,
): ReturnType<typeof expandLoop> {
  // I considered implementing this by inserting `code` in the string once and using a
  // command to jump back to the start of `code` at the end of each iteration if the
  // condition is true. This way avoids having to re-expand the while loop on every
  // iteration. However, this won't work because macros defined with \newcommand remove
  // everything before the macro in parser.string, so if `code` contained a macro call,
  // some of `code` would be removed and the jump back would fail.

  // whileLoop is the code that was called, e.g., \whilebool{flag}{...}
  const whileLoop = parser.string.slice(startI, parser.i);
  const expanded = `${conditional}{${code}${whileLoop}}{\\loopbreak}`;
  return expandLoop(parser, startI, expanded);
}

const EtoolboxMethods = {
  /**
   * Handles `\numexpr`.
   *
   * Evaluates the numeric expression and pushes the result to the parser stack (so
   * that it can be parsed by commands expecting a number).
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   */
  NumExpr(parser: TexParser, name: string) {
    const number = Util.EvalNumberExpr(parser, name);
    parser.Push(parser.itemFactory.create("number", number));
  },

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
    counter.value = Util.EvalNumberExpr(parser, name);
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
    const startI = parser.i - name.length;
    const cs = Util.GetCsNameArgument(parser, name);
    const bool = Flag.get(type, cs);
    Util.ExpandConditionsBranch(parser, name, startI, bool, negate);
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
    const startI = parser.i - name.length;
    const cs = Util.GetCsNameArgument(parser, name);
    const handlers = handlerTypes.map((type) =>
      parser.configuration.handlers.get(type),
    );
    const isDefined = handlers.some((handler) => handler.contains(cs));
    Util.ExpandConditionsBranch(parser, name, startI, isDefined, negate);
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
    const startI = parser.i - name.length;
    const cs = Util.GetCsNameArgument(parser, name);
    const macro = Util.getMacro(parser, cs);
    // macro.func.length - 2 because first two arguments are parser and name
    const condition =
      macro !== undefined &&
      (withParams === undefined || withParams === !!(macro.func.length - 2));
    Util.ExpandConditionsBranch(parser, name, startI, condition);
  },

  /**
   * Handles `\ifdefempty`, `\ifcsempty`, `\ifdefvoid`, and `\ifcsvoid`.
   *
   * Each command is called with arguments `{<macro>}{<true>}{<false>}`. If `<macro>`
   * is defined, takes no arguments, and expands to nothing, the command expands to
   * `<true>`. `\ifdefvoid` and `\ifcsvoid` also expand to `<true>` if `<macro>` is
   * undefined.
   *
   * `\ifcsempty` and `\ifcsvoid` are aliases for `\ifdefempty` and `\ifdefvoid`,
   * respectively.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {boolean} [orVoid=false] Whether to expand to `<true>` if `<macro>` is
   *   undefined.
   */
  IfDefEmpty(parser: TexParser, name: string, orVoid: boolean = false) {
    const startI = parser.i - name.length;
    const cs = Util.GetCsNameArgument(parser, name);
    const macro = Util.getMacro(parser, cs);
    // The first argument of a macro is the string the macro expands to.
    // See the source code for NewCommand in NewcommandMethods.ts and for Macro
    // in BaseMethods.ts (line 1837 at time of writing)
    const macroString = macro?.args?.[0] as string;
    let condition = false;
    if (!macro) condition = orVoid;
    else if (macro.func.length === 2) condition = macroString.trim() === "";
    Util.ExpandConditionsBranch(parser, name, startI, condition, orVoid);
  },

  /**
   * Handles `\ifdefstring`, `\ifcsstring`, `\ifdefstrequal`, and `\ifcsstrequal`.
   *
   * The first two are called with arguments `{<macro>}{<string>}{<true>}{<false>}`.
   * If `<macro>` is defined and expands to `<string>`, the command expands to `<true>`
   * and otherwise expands to `<false>`. The last two are called with arguments
   * `{<macro>}{<macro>}{<true>}{<false>}`. If the two macros expand to the same
   * string, the command expands to `<true>` and otherwise expands to `<false>`.
   *
   * `\ifcsstring` and `\ifcsstrequal` are aliases for `\ifdefstring` and
   * `\ifdefstrequal`, respectively.
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {boolean} [bothMacros=false] Whether to compare two macros rather than a
   *   macro and a string.
   */
  IfDefString(parser: TexParser, name: string, bothMacros: boolean = false) {
    const startI = parser.i - name.length;
    const cs1 = Util.GetCsNameArgument(parser, name);
    const macro1 = Util.getMacro(parser, cs1);

    let condition;
    if (!macro1) {
      condition = false;
    } else if (bothMacros) {
      const cs2 = Util.GetCsNameArgument(parser, name);
      const macro2 = Util.getMacro(parser, cs2);
      condition = macro1.args[0] === macro2?.args[0];
    } else {
      condition = macro1.args[0] === parser.GetArgument(name);
    }
    Util.ExpandConditionsBranch(parser, name, startI, condition);
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
    const startI = parser.i - name.length;
    const cs = Util.GetCsNameArgument(parser, name);
    const counter = Util.Counter.get(cs, false);
    Util.ExpandConditionsBranch(parser, name, startI, !!counter);
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
    const startI = parser.i - name.length;
    const str1 = parser.GetArgument(name);
    const str2 = parser.GetArgument(name);
    Util.ExpandConditionsBranch(parser, name, startI, str1 === str2);
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
    const startI = parser.i - name.length;
    let str = parser.GetArgument(name);
    if (trim) str = str.trim();

    Util.ExpandConditionsBranch(parser, name, startI, str === "", negate);
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
    const startI = parser.i - name.length;
    const num1 = Util.EvalNumberExpr(parser, name);
    if (!relationSym) {
      relationSym = parser.GetArgument(name) as RelationSymbol;
    }
    const num2 = Util.EvalNumberExpr(parser, name);
    const relation = relations[relationSym];
    if (!relation) {
      throw new TexError(
        "InvalidRelation",
        "Invalid relation: %1",
        relationSym,
      );
    }
    Util.ExpandConditionsBranch(parser, name, startI, relation(num1, num2));
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
    const startI = parser.i - name.length;
    const num = Util.EvalNumberExpr(parser, name);
    Util.ExpandConditionsBranch(parser, name, startI, num % 2 === parity);
  },

  DeclareListParser(parser: TexParser, name: string) {
    const star = parser.GetStar();
    const cs = Util.GetCsNameArgument(parser, name, true);
    const separator = parser.GetArgument(name);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const func = EtoolboxMethods.ListParser;
    const args = [separator];
    if (star) args.push("\\do");
    Util.addMacro(parser, LIST_PARSER_MAP, cs, func, args);
  },

  ListParser(
    parser: TexParser,
    name: string,
    separator: string,
    handler?: string,
  ) {
    const startI = parser.i - name.length;
    handler ??= parser.GetArgument(name);
    const listString = parser.GetArgument(name);
    const list = Util.separateList(listString, separator);
    parser.Push(expandListLoop(parser, startI, list, handler));
  },

  NewList(parser: TexParser, name: string) {
    const cs = Util.GetCsNameArgument(parser, name);
    Util.List.create(cs);
  },

  ListAdd(parser: TexParser, name: string) {
    const list = Util.GetList(parser, name);
    const item = parser.GetArgument(name);
    if (item !== "") list.push(item); // etoolbox ignores empty items
  },

  ListRemove(parser: TexParser, name: string) {
    const list = Util.GetList(parser, name);
    const item = parser.GetArgument(name);
    const index = list.indexOf(item);
    if (index !== -1) list.splice(index, 1);
  },

  ListLoop(parser: TexParser, name: string, handler?: string) {
    const startI = parser.i - name.length;
    handler ??= parser.GetArgument(name);
    const list = Util.GetList(parser, name);
    parser.Push(expandListLoop(parser, startI, list, handler));
  },

  WhileFlag(parser: TexParser, name: string, type: string, negate: boolean) {
    const startI = parser.i - name.length;
    const flag = Util.GetCsNameArgument(parser, name);
    const code = parser.GetArgument(name);
    const conditional = `${negate ? "\\not" : "\\if"}${type}{${flag}}`;
    parser.Push(expandWhileLoop(parser, startI, code, conditional));
  },

  LoopBreak(parser: TexParser, name: string) {
    const top = parser.stack.Top();
    if (!top.isKind("loop")) {
      throw new TexError(
        "UnexpectedLoopBreak",
        "\\loopbreak must be inside a loop",
      );
    }
    // Skip to the end of the loop. This leaves parser.i at the character after loopend
    parser.GetUpTo(name, "\\loopend");
    // The loopBreak causes the loop to get popped from the stack, pushing its children
    parser.Push(parser.itemFactory.create("loopBreak"));
  },

  IfInList(parser: TexParser, name: string) {
    const startI = parser.i - name.length;
    const item = parser.GetArgument(name);
    const list = Util.GetList(parser, name);
    Util.ExpandConditionsBranch(parser, name, startI, list.includes(item));
  },

  IfRomanNumeral(parser: TexParser, name: string) {
    const startI = parser.i - name.length;
    const str = parser.GetArgument(name);
    Util.ExpandConditionsBranch(parser, name, startI, Util.isRomanNumeral(str));
  },

  /**
   * Handles `\strlength{<string>}`.
   *
   * This expands to the length of `<string>` (the number of characters in it). Note
   * that it simply uses the JavaScript `length` property, so it doesn't account for
   * Unicode characters that are represented by multiple code units. For example,
   * `\strlength{😶‍🌫️}` expands to 6.
   */
  StrLength(parser: TexParser, name: string) {
    const str = parser.GetArgument(name);
    parser.Push(parser.itemFactory.create("number", str.length));
  },

  /**
   * Handles `\macrolength{<macro>}`.
   *
   * This expands to the length of the expansion of `<macro>` (the number of characters
   * in the macro's expansion). No arguments should be given to `<macro>`. If `<macro>`
   * is undefined, an error is thrown.
   *
   * As an example, consider the following:
   * ```
   * \newcommand{\myMacro}{abc}
   * \macrolength{\myMacro} % expands to 3
   *
   * \newcommand[2]{\myMacroTwo}{#1#2}
   * \macrolength{\myMacroTwo} % expands to 4
   * ```
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @throws {TexError} If `<macro>` is undefined.
   */
  MacroLength(parser: TexParser, name: string) {
    const cs = Util.GetCsNameArgument(parser, name);
    const macro = Util.getMacro(parser, cs);
    if (!macro) {
      throw new TexError("UndefinedMacro", `Macro "${cs}" is undefined`);
    }
    const expansion = macro.args[0] as string;
    parser.Push(parser.itemFactory.create("number", expansion.length));
  },
} satisfies Record<string, ParseMethod>;

export default EtoolboxMethods;
