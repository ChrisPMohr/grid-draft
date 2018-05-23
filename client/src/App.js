import React, { Component } from 'react';
import './App.css';
import Routes from "./Routes";
import { Link } from "react-router-dom";


export default class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <Link className="App-title" to="/">Grid Draft</Link>
          <Link className="App-header-link" to="/signup">Signup</Link>
          <Link className="App-header-link" to="/login">Login</Link>
        </header>
        <Routes />
      </div>
    );
  }
}
