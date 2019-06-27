import React, { Component } from "react";
import "mana-font/css/mana.min.css";


const manaCostMapping = {
  '0': 'ms-0',
  '1': 'ms-1',
  '2': 'ms-2',
  '3': 'ms-3',
  '4': 'ms-4',
  '5': 'ms-5',
  '6': 'ms-6',
  '7': 'ms-7',
  '8': 'ms-8',
  '9': 'ms-9',
  '10': 'ms-10',
  '11': 'ms-11',
  '12': 'ms-12',
  '13': 'ms-13',
  '14': 'ms-14',
  '15': 'ms-15',
  'X': 'ms-x',
  'W': 'ms-w',
  'U': 'ms-u',
  'B': 'ms-b',
  'R': 'ms-r',
  'G': 'ms-g',
  'W/P': 'ms-w ms-p',
  'U/P': 'ms-u ms-p',
  'B/P': 'ms-b ms-p',
  'R/P': 'ms-r ms-p',
  'G/P': 'ms-g ms-p',
  '2/W': 'ms-2w',
  '2/U': 'ms-2u',
  '2/B': 'ms-2b',
  '2/R': 'ms-2r',
  '2/G': 'ms-2g',
  'W/U': 'ms-wu',
  'W/B': 'ms-wb',
  'U/B': 'ms-ub',
  'U/R': 'ms-ur',
  'B/R': 'ms-br',
  'B/G': 'ms-bg',
  'R/G': 'ms-rg',
  'R/W': 'ms-rw',
  'G/W': 'ms-gw',
  'G/U': 'ms-gu',
}

const sharedClasses = "ms ms-cost ms-shadow"

export default class ManaCost extends Component {
  getManaSymbolClass(symbolText) {
    const symbolClass = manaCostMapping[symbolText];
    if (symbolClass === undefined) {
      return "";
    } else {
      return sharedClasses + " " + symbolClass;
    }
  }

  getManaSymbol(symbolText) {
    return (<i className={this.getManaSymbolClass(symbolText)}/>);
  }

  getManaSymbols(symbolsText) {
    const symbolsTemp = symbolsText.split("}")
    symbolsTemp.pop();
    const symbols = symbolsTemp.map(s => s.substring(1));
    return symbols.map(s => this.getManaSymbol(s));
  }

  render() {
    const manaCost = this.props.cost;

    var symbols = [];
    if (manaCost !== null && manaCost !== undefined) {
      if (manaCost.indexOf(" // ") != -1) {
        const splitCosts = manaCost.split(" // ");
        symbols.push(...this.getManaSymbols(splitCosts[0]));
        symbols.push((<span>//</span>));
        symbols.push(...this.getManaSymbols(splitCosts[1]));
      } else {
        symbols.push(...this.getManaSymbols(manaCost));
      }
    }

    return (
      <span>
        {symbols}
      </span>
    );
  }
}
