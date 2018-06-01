import React, { Component } from "react";
import "./Draft.css";


class Card extends Component {
  render() {
    return (
      <img
        className={"card-image " + (this.props.data.selected ? "selected" : "")}
        src={this.props.data.url}
        alt={this.props.data.name}
        title={this.props.data.name}
      />
    )
  }
}

class RowButton extends Component {
  handleClick = async () => {
    const response = await fetch('/api/pick_cards', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({row: this.props.row_number}),
      method: 'POST'
    });
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    await this.props.updateDraft();

    return body;
  };

  render() {
    return (
      <button
        className={"row-button grid-button ion-arrow-right-a " + (this.props.selected ? "hidden" : "")}
        onClick={this.handleClick} />
    )
  }
}

class ColumnButton extends Component {
  handleClick = async () => {
    const response = await fetch('/api/pick_cards', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({col: this.props.column_number}),
      method: 'POST'
    });
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    await this.props.updateDraft();

    return body;
  };

  render() {
    return (
      <button
        className={"col-button grid-button ion-arrow-down-a " + (this.props.selected ? "hidden": "")}
        onClick={this.handleClick} />
    )
  }
}

class CardRow extends Component {
  render() {
    return (
      <div className="card-row">
        <RowButton
          row_number={this.props.row_number}
          selected={this.props.selected}
          updateDraft={this.props.updateDraft} />
        {this.props.data.map((card_data) =>
          <Card key={card_data.name} data={card_data} />)}
      </div>
    )
  }
}

class ColumnButtons extends Component {
  render() {
    var buttons = [];
    for (var i=0; i < this.props.size; i++) {
      buttons.push(
        (<ColumnButton
           key={i}
           column_number={i + 1}
           selected={this.props.selectedCol === i}
           updateDraft={this.props.updateDraft} />)
      );
    }

    return (
      <div className="col-button-row">
        <div className="origin-spacer" />
        {buttons}
      </div>
    )
  }
}

class Decklist extends Component {
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
      <div>{this.props.card.name}</div>
    );
  }
}

class ActiveDraft extends Component {
  state = {
    cards: null,
    decklist: null,
    selectedCol: null,
    selectedRow: null
  };

  async componentDidMount() {
    await this.updateDraft();
  }

  updateDraft = async () => {
    await this.getCurrentPack();
    await this.updateDecklist();
  }

  getCurrentPack = async () => {
    const response = await fetch('/api/current_pack', {
      credentials: 'same-origin',
    });
    const body = await response.json();

    if (response.status !== 200) {
      console.log(body.message);
      throw Error(body.message);
    }

    this.setState({
      cards: body.cards,
      selectedCol: body.selected_col,
      selectedRow: body.selected_row
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

  render() {
    return (
      <div className="DraftContainer">
        <Decklist decklist={this.state.decklist}/>
        { this.state.cards &&
          <div className="draft">
            <ColumnButtons
              size={this.state.cards.length}
              selectedCol={this.state.selectedCol}
              updateDraft={this.updateDraft} />
            {this.state.cards.map((row_data, i) =>
              <CardRow
                key={i}
                data={row_data}
                row_number={i + 1}
                selected={this.state.selectedRow === i}
                updateDraft={this.updateDraft} />)}
          </div>
        }
      </div>
    );
  }
}

export default class Draft extends Component {
  state = {
    draft: null,
  };

  async componentDidMount() {
    await this.getCurrentDraft();
  }

  getCurrentDraft = async () => {
    const response = await fetch('/api/current_draft', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (response.status !== 200) {
      const error_body = await response.text();
      console.log("Get current draft failed: ", error_body);
      throw Error("Get current draft failed");
    }

    const body = await response.json()
    this.setState({draft: body});
  }

  render() {
    if (!this.state.draft) {
      return (
        <div>Can't find draft. Go home?</div>
      )
    }

    if (this.state.draft.started) {
      return (<ActiveDraft seat={this.props.match.params.seat}/>);
    } else {
      return (<div>Waiting for draft to start</div>);
    }
  }
}
