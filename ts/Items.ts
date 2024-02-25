import type { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";

import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import { BaseItem } from "mathjax-full/js/input/tex/StackItem.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";

export class NumberItem extends BaseItem {
  public get kind() {
    return "number";
  }

  public toMml(_inferred: boolean, _forceRow?: boolean): MmlNode {
    const number = this.getProperty("number") as number;
    if (number === undefined) {
      throw new TexError("MissingNumber", "Missing number");
    }

    const parser = this.factory.configuration.parser;
    const def = ParseUtil.getFontDef(parser);
    return parser.create("token", "mn", def, number.toLocaleString());
  }
}
