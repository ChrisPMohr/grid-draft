import React, { Component } from "react";

import './DraftList.css';
import { AuthConsumer } from '../AuthContext';

class DraftListItem extends Component {
  joinDraft = async () => {
    const response = await fetch('/api/join_current_draft', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      method: 'POST'
    });

    if (response.status !== 200) {
      console.log("Join draft failed");
      throw Error("Join draft failed");
    }

    this.props.history.push('/draft');
  }

  render() {
    return (
      <div className="DraftListItem">
        <div>
          Draft {this.props.draft.id}
        </div>
        {this.props.authContext.isAuth && (
          <div>
            <button onClick={this.joinDraft}>
              Join
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default class DraftList extends Component {
  state = {
    currentDraft: null
  };

  async componentDidMount() {
    await this.getCurrentDraft();
  }

  getCurrentDraft = async () => {
    const response = await fetch('/api/current_draft', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (response.status !== 200) {
      const error_body = await response.text();
      console.log("Get current draft failed: ", error_body);
      throw Error("Get current draft failed");
    }

    const body = await response.json()
    this.setState({currentDraft: body});
  }

  createNewDraft = async () => {
    const response = await fetch('/api/draft', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      method: 'POST'
    });

    if (response.status !== 200) {
      console.log("Create new draft failed");
      throw Error("Create new draft failed");
    }

    const body = await response.json()
    this.setState({currentDraft: body});
    this.props.history.push('/draft');
  }

  render() {
    return (
      <AuthConsumer>
        {(authContext) => (
          <div className="DraftListContainer">
            {this.state.currentDraft && (
              <DraftListItem
                authContext={authContext}
                draft={this.state.currentDraft}
                history={this.props.history} />
            )}
            {authContext.isAuth && (
              <div>
                <button onClick={this.createNewDraft}>
                  Create new draft!
                </button>
              </div>
            )}
          </div>
        )}
      </AuthConsumer>
    );
  }
}
