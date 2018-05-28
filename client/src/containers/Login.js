import React, { Component } from "react";
import "./Login.css";

import { AuthConsumer } from '../AuthContext';

export default class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username: "",
      password: ""
    };
  }

  validateForm() {
    return this.state.username.length > 0 && this.state.password.length > 0;
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  }

  handleLogin = async (event, authContext) => {
    event.preventDefault();

    const response = await fetch('/auth/login', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(
        {
          username: this.state.username,
          password: this.state.password,
        }),
      method: 'POST'
    });

    if (response.status !== 200) {
      alert("Login failed!");
      throw Error("Login failed");
    }

    const body = await response.json()

    authContext.login(body.user);
    this.props.history.push('/');
  }

  render() {
    return (
      <div className="Login">
        <AuthConsumer>
          {(context) => (
            <form onSubmit={event => this.handleLogin(event, context)}>
              <div>
                <label>Username</label>
                <input
                  name="username"
                  autoFocus
                  type="text"
                  value={this.state.username}
                  onChange={this.handleChange}
                />
              </div>
              <div>
                <label>Password</label>
                <input
                  name="password"
                  value={this.state.password}
                  onChange={this.handleChange}
                  type="password"
                />
              </div>
                <input
                  disabled={!this.validateForm()}
                  type="submit"
                  value="Login"
                />
            </form>
          )}
        </AuthConsumer>
      </div>
    );
  }
}
