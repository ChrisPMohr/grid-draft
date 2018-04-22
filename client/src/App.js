import React, { Component } from 'react';
import logo from './logo.svg';
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
    this.callApi()
      .then(res => this.setState({ response: res }))
      .catch(err => console.log(err));
  }

  callApi = async () => {
    const response = await fetch('/api/static_pack');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to Grid Draft</h1>
        </header>
        { this.state.response != null &&
          <div className="draft">
            <CardRow data={this.state.response.row_1} />
            <CardRow data={this.state.response.row_2} />
            <CardRow data={this.state.response.row_3} />
          </div>
        }
      </div>
    );
  }
}

export default App;
