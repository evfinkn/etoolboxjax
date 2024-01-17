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
