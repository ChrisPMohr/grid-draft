import React from "react";
import { Route, Switch } from "react-router-dom";
import Draft from "./containers/Draft";
import DraftList from "./containers/DraftList";
import Login from "./containers/Login";
import Signup from "./containers/Signup";
import NotFound from "./containers/NotFound";

export default () =>
  <Switch>
    <Route path="/" exact component={DraftList} />
    <Route path="/draft/seat/:seat" component={Draft} />
    <Route path="/login" exact component={Login} />
    <Route path="/signup" exact component={Signup} />
    <Route component={NotFound} />
  </Switch>;
