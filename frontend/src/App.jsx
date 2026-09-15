import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ChatWidget from "./ChatWidget";
import Home from "./pages/Home";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import ContactUs from "./pages/ContactUs";
import { API_BASE } from "./api";
import "./App.css";

// Which component renders for a path is still code (as it is in any
// framework — Next.js, Rails, Django all wire routes in code too). What's
// DB-driven is the nav label/order and, more importantly, every page's
// actual content — see the fetch() calls inside each page component.
const ROUTE_COMPONENTS = {
  "/": Home,
  "/pricing": Pricing,
  "/about": About,
  "/contact-us": ContactUs,
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/pages`)
      .then((res) => res.json())
      .then(setPages)
      .catch(() => setPages([]));
  }, []);

  return (
    <div className="site">
      <nav className="site-nav">
        {pages.map((p) => (
          <Link key={p.path} to={p.path}>
            {p.navLabel}
          </Link>
        ))}
      </nav>

      <main className="site-main">
        <Routes>
          {pages
            .filter((p) => ROUTE_COMPONENTS[p.path])
            .map((p) => {
              const Component = ROUTE_COMPONENTS[p.path];
              return <Route key={p.path} path={p.path} element={<Component />} />;
            })}
        </Routes>
      </main>

      <ChatWidget
        siteName="Acme Widgets"
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
}

export default App;
