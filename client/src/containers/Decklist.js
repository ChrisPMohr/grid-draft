import React, { Component } from "react";
import ManaCost from "./ManaCost";
import "./Decklist.css";


export default class Decklist extends Component {
  render() {
    var cards = [];
    for (var i=0; this.props.decklist && i < this.props.decklist.length; i++) {
      cards.push(
        (<DecklistItem
           key={i}
           card={this.props.decklist[i]} />)
      );
    }

    return (
      <div className="Decklist">
        <h1>Decklist</h1>
        {cards}
      </div>
    );
  }
}

class DecklistItem extends Component {
  render() {
    return (
      <div className="DecklistItem">
        {this.props.card.name + " "}
        <ManaCost cost={this.props.card.mana_cost}/>
      </div>
    );
  }
}
