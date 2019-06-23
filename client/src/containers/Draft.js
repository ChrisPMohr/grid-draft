import React, { Component } from "react";
import GridDraft from "./GridDraft";


export default class Draft extends Component {
  state = {
    draft: null,
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
          'grid': <GridDraft seat={this.props.match.params.seat}/>
        }[this.state.draft.type]
      );
    } else {
      return (<div>Waiting for draft to start</div>);
    }
  }
}
