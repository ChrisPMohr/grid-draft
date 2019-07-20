import React, { Component } from "react";
import GridDraft from "./GridDraft";
import GlimpseDraft from "./GlimpseDraft";


export default class Draft extends Component {
  state = {
    draft: null,
  };

  async componentDidMount() {
    await this.getCurrentDraft();

    const ws = new WebSocket('ws://34.73.130.219:8080');
    console.log("Created websocket connection");
    ws.onopen = (event) => {
      ws.send(this.props.match.params.seat);
      console.log("Sent websocket message");
    }
    ws.addEventListener('message', (event) => {
      console.log("Got refresh message in lobby");
      if (!(this.state.draft && this.state.draft.started)) {
        this.getCurrentDraft();
      }
    });
    this.setState({ws: ws});
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
    this.setState({draft: body});
  }

  render() {
    if (!this.state.draft) {
      return (
        <div>Can't find draft. Go home?</div>
      )
    }

    if (this.state.draft.started) {
      return (
        {
          'grid': <GridDraft seat={this.props.match.params.seat} ws={this.state.ws}/>,
          'glimpse': <GlimpseDraft seat={this.props.match.params.seat} ws={this.state.ws}/>
        }[this.state.draft.type]
      );
    } else {
      return (<div>Waiting for draft to start</div>);
    }
  }
}
