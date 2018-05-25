import React, { Component } from "react";
import "./Login.css";

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

  handleSubmit = async event => {
    event.preventDefault();

    const response = await fetch('/api/login', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        {
          username: this.state.username,
          password: this.state.password,
        }),
      method: 'POST'
    });
    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message);
    }

    alert("Logged in");
  }

  render() {
    return (
      <div className="Login">
        <form onSubmit={this.handleSubmit}>
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
      </div>
    );
  }
}
