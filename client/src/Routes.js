import React from "react";
import { Route, Switch } from "react-router-dom";
import Draft from "./containers/Draft";
import Login from "./containers/Login";
import NotFound from "./containers/NotFound";

export default () =>
  <Switch>
    <Route path="/" exact component={Draft} />
    <Route path="/login" exact component={Login} />
    <Route component={NotFound} />
  </Switch>;
