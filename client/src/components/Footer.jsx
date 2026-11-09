import React from 'react';
import { Link } from 'react-router-dom';
import { PrimaryNavigation } from './ui';

export default function Footer() {
  return (
    <footer className="forma-public__footer">
      <Link to="/" className="forma-site-header__brand">FORMA</Link>
      <div className="forma-public__footer-links">
        <PrimaryNavigation publicMode />
        <Link to="/contact">Contact</Link>
      </div>
      <p>© {new Date().getFullYear()} FORMA</p>
    </footer>
  );
}
