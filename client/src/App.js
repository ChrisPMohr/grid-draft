import React, { Component } from 'react';
import './App.css';

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
        className="row-button grid-button ion-arrow-right-a"
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
        className="col-button grid-button ion-arrow-down-a"
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

class App extends Component {
  constructor(props) {
    super(props);
    this.getCurrentPack = this.getCurrentPack.bind(this);
  }
  
  state = {
    cards: null
  };

  componentDidMount() {
    this.getCurrentPack();
  }

  getCurrentPack() {
    this.getCurrentPackApi()
      .then(res => {
        this.setState({ cards: res.cards })
      })
      .catch(err => console.log(err));
  }

  getNewPack() {
    this.postNewPackApi()
      .then(res => this.getCurrentPack())
      .catch(err => console.log(err));
  }

  getCurrentPackApi = async () => {
    const response = await fetch('/api/current_pack');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  postNewPackApi = async () => {
    const response = await fetch('/api/new_pack', {
      method: 'POST'
    });
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Welcome to Grid Draft</h1>
        </header>
        { this.state.cards != null &&
          <div className="draft">
            <ColumnButtons
              size={this.state.cards.length}
              getCurrentPack={this.getCurrentPack} />
            {this.state.cards.map((row_data, i) =>
              <CardRow
                key={i}
                data={row_data}
                row_number={i + 1}
                getCurrentPack={this.getCurrentPack} />)}
          </div>
        }
        <button onClick={() => this.getNewPack()}>
          Get new pack!
        </button>
      </div>
    );
  }
}

export default App;
