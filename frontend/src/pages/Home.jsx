import { useEffect, useState } from "react";
import { getPageContent } from "../api";

function Home() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    getPageContent("home").then((data) => setBlocks(data.blocks || []));
  }, []);

  return (
    <section>
      {blocks.map((b, i) => (
        <div key={i}>
          <h1>{b.heading}</h1>
          <p>{b.body}</p>
        </div>
      ))}
    </section>
  );
}

export default Home;
