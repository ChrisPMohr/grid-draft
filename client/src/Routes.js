import React from "react";
import { Route, Switch } from "react-router-dom";
import Draft from "./containers/Draft";

export default () =>
  <Switch>
    <Route path="/" exact component={Draft} />
  </Switch>;
