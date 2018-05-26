import React, { Component } from 'react';
import './App.css';
import Routes from "./Routes";
import { withRouter, Link } from "react-router-dom";

import { AuthConsumer, AuthProvider } from './AuthContext';


export default withRouter(class App extends Component {
  handleLogout = async (event, authContext) =>{
    const response = await fetch('/auth/logout', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      method: 'POST'
    });

    if (response.status !== 200) {
      alert("Logout failed!");
      throw Error("Logout failed");
    }

    authContext.logout();
    this.props.history.push('/login');
  }

  render() {
    return (
      <div className="App">
        <AuthProvider>
          <AuthConsumer>
            {(context) => (
              <nav className="App-header">
                <Link className="App-title" to="/">Grid Draft</Link>

                {context.isAuth ? (
                  <a
                    className="App-header-link"
                    authContext={context}
                    onClick={event => this.handleLogout(event, context)}>
                      Logout
                  </a>
                ) : (
                  <div>
                    <Link className="App-header-link" to="/signup">Signup</Link>
                    <Link className="App-header-link" to="/login">Login</Link>
                  </div>
                )}

              </nav>
            )}
          </AuthConsumer>
          <Routes />
        </AuthProvider>
      </div>
    );
  }
});
