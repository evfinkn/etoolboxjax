import type { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";

import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import { BaseItem } from "mathjax-full/js/input/tex/StackItem.js";
import StackItemFactory from "mathjax-full/js/input/tex/StackItemFactory.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";

export class NumberItem extends BaseItem {
  constructor(factory: StackItemFactory, number: number) {
    super(factory);
    this.setProperty("number", number);
    // We add the number to this item's children so that it is correctly added to
    // the top item of the stack's children when this item is pushed. Otherwise,
    // undefined is added to the top item's children.
    this.Push(this.toMml(false));
  }

  public get kind() {
    return "number";
  }

  // The item is done parsing (no more children to add). This means that the item will
  // get pushed to the top item's children and not put on the stack. (If it's put on
  // the stack, the final stop item will never reach the start item in checkitem.)
  public get isFinal() {
    return true;
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
