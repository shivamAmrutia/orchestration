import { Routes, Route, Link } from "react-router-dom";
import TemplatesPage from "./pages/TemplatesPage.jsx";
import ExecutionPage from "./pages/ExecutionPage.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">
          Automation Playground
        </Link>
        <span className="tagline">DAG execution demo shell</span>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<TemplatesPage />} />
          <Route path="/runs/:executionId" element={<ExecutionPage />} />
        </Routes>
      </main>
    </div>
  );
}
