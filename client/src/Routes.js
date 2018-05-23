import React from "react";
import { Route, Switch } from "react-router-dom";
import Draft from "./containers/Draft";
import NotFound from "./containers/NotFound";

export default () =>
  <Switch>
    <Route path="/" exact component={Draft} />
    <Route component={NotFound} />
  </Switch>;
