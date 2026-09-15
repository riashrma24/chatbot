import { useEffect, useState } from "react";
import { getPageContent } from "../api";

function ContactUs() {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    getPageContent("contact-us").then((data) => setContact(data.contact || null));
  }, []);

  if (!contact) return null;

  return (
    <section>
      <h1>Contact Us</h1>
      <p>
        Email us at <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>
      {contact.phone && <p>Phone: {contact.phone}</p>}
      <p>Support hours: {contact.hours}</p>
    </section>
  );
}

export default ContactUs;
