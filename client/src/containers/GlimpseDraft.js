import React, { Component } from "react";
import "./GlimpseDraft.css";
import Decklist from "./Decklist";


class Card extends Component {
  statusClass() {
    return (this.props.data.selected ? "selected" : "") + " " + (this.props.data.burned ? "burned" : "")
  }

  render() {
    return (
      <div className={"glimpse-card-container " + this.statusClass()}>
        <img
          className={"glimpse-card-image " + this.statusClass()}
          src={this.props.data.url}
          alt={this.props.data.name}
          title={this.props.data.name}
          onClick={e => this.props.onClickCard(this.props.data.card_number)}
        />
       </div>
    )
  }
}

class CardRow extends Component {
  render() {
    return (
      <div className="glimpse-card-row">
        {this.props.data.map((card_data) =>
          <Card key={card_data.name} data={card_data} onClickCard={this.props.onClickCard}/>)}
      </div>
    )
  }
}

export default class GlimpseDraft extends Component {
  state = {
    cards: null,
    decklist: null,
    pack_number: null,
    picks: null
  };

  async componentDidMount() {
    await this.updateDraft();
    this.connection = new WebSocket('ws://34.73.130.219:8080');
    console.log("Created websocket connection");
    this.connection.onopen = (event) => {
      this.connection.send(this.props.seat);
      console.log("Sent websocket message");
    }
    this.connection.onmessage = (event) => {
      console.log("Got refresh message");
      this.getDraftState();
    }
  }

  updateDraft = async () => {
    await this.getDraftState();
    await this.updateDecklist();
  }

  getDraftState = async () => {
    const response = await fetch('/api/current_draft/seat/' + this.props.seat + '/state', {
      credentials: 'same-origin',
    });
    const body = await response.json();

    if (response.status !== 200) {
      console.log(body.message);
      throw Error(body.message);
    }

    this.setState({
      pack_number: body.pack_number,
      cards: body.cards,
      picks: []
    })
  };

  updateDecklist = async () => {
    const response = await fetch('/api/current_draft/seat/' + this.props.seat + '/decklist', {
      credentials: 'same-origin',
    });
    const body = await response.json();

    if (response.status !== 200) {
      console.log(body.message);
      throw Error(body.message);
    }

    this.setState({
      decklist: body
    });
  };

  onClickCard = async card_number => {
    if (this.state.picks.includes(card_number)) {
      console.log("Repicking card");
      return;
    }

    const pickedCardIndex = this.state.cards.findIndex(card => {
      return card.card_number === card_number;
    });
    if (pickedCardIndex === -1) {
      console.log("Picking missing card");
      return;
    }

    const updatedPicks = this.state.picks.concat(card_number);

    const updatedCards = [...this.state.cards];
    if (updatedPicks.length == 1) {
      updatedCards[pickedCardIndex].selected = true;
    } else {
      updatedCards[pickedCardIndex].burned = true;
    }

    this.setState({
      picks: updatedPicks,
      cards: updatedCards
    });
    if (updatedPicks.length === 3) {
      await this.pickCards(updatedPicks);
    }
  }

  pickCards = async picks => {
    const response = await fetch('/api/current_draft/seat/' + this.props.seat + '/pick_cards', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({selected_card_number: picks[0], burned_card_numbers: picks.slice(1)}),
      method: 'POST'
    });
    const body = await response.json();

    await this.updateDraft();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    return (
      <div className="DraftContainer">
        <p>Pack Number {this.state.pack_number}</p>
        <Decklist decklist={this.state.decklist}/>
        { this.state.cards &&
          <div className="draft">
            <CardRow
              data={this.state.cards}
              onClickCard={this.onClickCard} />
          </div>
        }
      </div>
    );
  }
}
