import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import EtoolboxMethods from "./EtoolboxMethods.js";
import EtoolboxUtil from "./EtoolboxUtil.js";

export const EtoolboxCommandMap = new CommandMap(
  EtoolboxUtil.ETOOLBOX_COMMAND_MAP,
  {
    if: "If",
    else: "Else",
    fi: "Fi",
  },
  EtoolboxMethods,
);
