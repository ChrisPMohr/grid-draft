import React, { Component } from 'react';
import './Nav.css';
import { withRouter, Link } from "react-router-dom";

import { AuthConsumer } from '../AuthContext';


export default withRouter(class Nav extends Component {
  handleLogout = async event =>{
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

    this.props.authContext.logout();
    this.props.history.push('/login');
  }

  async componentDidMount() {
    const response = await fetch('/api/me', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      method: 'GET'
    });

    if (response.status === 200) {
      const body = await response.json()
      this.props.authContext.login(body.user);
    }
  }

  render() {
    return (
      <AuthConsumer>
        {(context) => (
          <nav className="Nav-header">
            <Link className="Nav-title" to="/">Grid Draft</Link>

            {this.props.authContext.isAuth ? (
              <div>
                <a
                  className="Nav-header-link"
                  onClick={this.handleLogout}>
                    Logout
                </a>
                <Link className="Nav-header-link Nav-header-user" to="/profile">
                  {this.props.authContext.user.username}
                </Link>
              </div>
            ) : (
              <div>
                <Link className="Nav-header-link" to="/signup">Signup</Link>
                <Link className="Nav-header-link" to="/login">Login</Link>
              </div>
            )}

          </nav>
        )}
      </AuthConsumer>
    );
  }
});
