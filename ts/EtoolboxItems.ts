/* eslint-disable @typescript-eslint/class-literal-property-style --
 * We have to use accessors instead of readonly properties because BaseItem defines
 * them as accessors. If we change them to instance properties, TypeScript complains
 * with ts(2160). Since we can't change it, we have to disable the rule.
 */

import {
  BaseItem,
  CheckType,
  StackItem,
} from "mathjax-full/js/input/tex/StackItem.js";

export class LoopItem extends BaseItem {
  public get kind() {
    return "loop";
  }

  public get isOpen() {
    return true;
  }

  public checkItem(item: StackItem): CheckType {
    if (item.isKind("loopBreak")) {
      return [[this.factory.create("mml", this.toMml())], true];
    }
    return super.checkItem(item);
  }
}

export class LoopBreakItem extends BaseItem {
  public get kind() {
    return "loopBreak";
  }

  public get isClose() {
    return true;
  }
}
