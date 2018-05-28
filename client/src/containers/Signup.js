import React, { Component } from "react";
import "./Signup.css";

export default class Signup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username: "",
      password: "",
      confirmPassword: ""
    };
  }

  validateForm() {
    return (
      this.state.username.length > 0 &&
      this.state.password.length > 0 &&
      this.state.password === this.state.confirmPassword
    );
  }

  handleChange = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  }

  handleSignup = async event => {
    event.preventDefault();

    const response = await fetch('/api/user', {
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
      const body = await response.json();
      alert("Account creation failed!");
      throw Error("Account creation failed: " + body);
    }

    alert("Created account " + this.state.username);

    this.props.history.push('/login');
  }

  render() {
    return (
      <div className="Signup">
        <form onSubmit={this.handleSignup}>
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
          <div>
            <label>Confirm Password</label>
            <input
              name="confirmPassword"
              value={this.state.confirmPassword}
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
