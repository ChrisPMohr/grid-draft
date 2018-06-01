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
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

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

    await this.props.getCurrentPack();

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
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

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

    await this.props.getCurrentPack();

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
          getCurrentPack={this.props.getCurrentPack} />
        {this.props.data.map((card_data) =>
          <Card key={card_data.name} data={card_data} />)}
      </div>
    )
  }
}

class ColumnButtons extends Component {
  render() {
    var buttons = [];
      for (var i=0; i < this.props.size; i++){
        buttons.push(
          (<ColumnButton
             key={i}
             column_number={i + 1}
             selected={this.props.selectedCol === i}
             getCurrentPack={this.props.getCurrentPack} />)
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

class ActiveDraft extends Component {
  constructor(props) {
    super(props);
    this.getCurrentPack = this.getCurrentPack.bind(this);
  }

  state = {
    cards: null,
    selectedCol: null,
    selectedRow: null
  };

  async componentDidMount() {
    await this.getCurrentPack();
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

  render() {
    return (
      <div className="DraftContainer">
        { this.state.cards &&
          <div className="draft">
            <ColumnButtons
              size={this.state.cards.length}
              selectedCol={this.state.selectedCol}
              getCurrentPack={this.getCurrentPack} />
            {this.state.cards.map((row_data, i) =>
              <CardRow
                key={i}
                data={row_data}
                row_number={i + 1}
                selected={this.state.selectedRow === i}
                getCurrentPack={this.getCurrentPack} />)}
          </div>
        }
        <div className="Decklist">
          <div>Black Lotus</div>
          <div>Storm Crow</div>
        </div>
      </div>
    );
  }
}

export default class Draft extends Component {
  state = {
    draft: null,
    seat: null
  };

  async componentDidMount() {
    this.setState({seat: this.props.match.params.seat});
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
      return (<ActiveDraft />);
    } else {
      return (<div>Waiting for draft to start</div>);
    }
  }
}
