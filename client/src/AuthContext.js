import React from 'react';

const AuthContext = React.createContext();

class AuthProvider extends React.Component {
  state = { 
    isAuth: false,
    user: null
  }

  constructor() {
    super()
    this.login = this.login.bind(this)
    this.logout = this.logout.bind(this)
  }

  login(user) {
    this.setState({ isAuth: true, user: user })
  }

  logout() {
    this.setState({ isAuth: false, user: null })
  }

  render() {
    return (
      <AuthContext.Provider
        value={{
          isAuth: this.state.isAuth,
          user: this.state.user,
          login: this.login,
          logout: this.logout
        }}>
          {this.props.children}
      </AuthContext.Provider>
    )
  }
}

const AuthConsumer = AuthContext.Consumer

export { AuthProvider, AuthConsumer }
