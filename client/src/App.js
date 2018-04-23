import React, { Component } from 'react';
import './App.css';

class Card extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: props.data.url,
      name: props.data.name
    }
  }

  render() {
    return (
      <img
        className="card-image"
        src={this.state.url}
        alt={this.state.name}
        title={this.state.name}
      />
    )
  }
}

class CardRow extends Component {
  render() {
    return (
      <div className="card-row">
        {this.props.data.map((card_data) =>
          <Card key={card_data.name} data={card_data} />)}
      </div>
    )
  }
}

class App extends Component {
  state = {
    response: null 
  };

  componentDidMount() {
    this.getCurrentPack();
  }

  getCurrentPack() {
    this.getCurrentPackApi()
      .then(res => this.setState({ response: res }))
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
        { this.state.response != null &&
          <div className="draft">
            {this.state.response.rows.map((row_data, i) =>
              <CardRow key={i} data={row_data} />)}
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
