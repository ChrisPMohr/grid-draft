import React, { Component } from 'react';
import './App.css';
import Nav from "./containers/Nav"
import Routes from "./Routes";

import { AuthConsumer, AuthProvider } from './AuthContext';


export default class App extends Component {
  render() {
    return (
      <div className="App">
        <AuthProvider>
          <AuthConsumer>
            {(context) => (
              <Nav authContext={context} />
            )}
          </AuthConsumer>
          <Routes />
        </AuthProvider>
      </div>
    );
  }
};
