import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import CreateJob from "./CreateJob";
import "./App.css";
import ViewJob from "./ViewJob";
import Stats from "./Stats";

const greetings = [
  "Beautiful website coming soon",
  "Please create jobs responsibly",
  "Please don't ddos this",
  "One at a time, there's enough cloud for everyone",
];
const greeting = greetings[Math.floor(Math.random() * greetings.length)];

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/new">
          <CreateJob />
        </Route>
        <Route path="/jobs/:id" component={ViewJob} />
        <Route path="/stats" component={Stats} />
        <Route path="/">
          <h1>ChunkyCloud</h1>
          <h2 className="blink">{greeting}</h2>
          <Link to="/new">Create a new job</Link>
          <br />
          <Link to="/stats">Statistics</Link>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
