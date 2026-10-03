/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GraphicsGallery } from './components/GraphicsGallery';
import { WebProjectsSection } from './components/WebProjectsSection';
import { PhotographySection } from './components/PhotographySection';
import { CareerHistorySection } from './components/CareerHistorySection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { AdminProvider } from './context/AdminContext';
import { AdminModal } from './components/AdminModal';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Restore theme preference if available
  useEffect(() => {
    const savedTheme = localStorage.getItem('kw_portfolio_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('kw_portfolio_theme', nextTheme);
  };

  const handleExploreGraphics = () => {
    const el = document.getElementById('graphics');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleExploreWeb = () => {
    const el = document.getElementById('web-dev');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenContact = () => {
    const el = document.getElementById('contact');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AdminProvider>
      <div
        className={`min-h-screen transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-[#090A0F] text-[#F3F4F6]'
            : 'bg-[#FAFAF9] text-[#18181B]'
        }`}
      >
        {/* Navigation */}
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenContact={handleOpenContact}
        />

        {/* Main Content */}
        <main>
          {/* Clean Hero Section with Personal Profile Photo */}
          <Hero
            theme={theme}
            onExploreGraphics={handleExploreGraphics}
            onExploreWeb={handleExploreWeb}
          />

          {/* Part 1: Graphic Design Gallery */}
          <GraphicsGallery theme={theme} />

          {/* Part 2: Web Development Projects */}
          <WebProjectsSection theme={theme} />

          {/* Part 3: Photography Section (Unlimited space with Neon Cloud DB) */}
          <PhotographySection theme={theme} />

          {/* Career History, Technical Coursework & Competencies */}
          <CareerHistorySection theme={theme} />

          {/* Contact Suite */}
          <ContactSection theme={theme} />
        </main>

        {/* Footer with Owner Access */}
        <Footer theme={theme} />

        {/* Password-protected Admin Modal */}
        <AdminModal theme={theme} />
      </div>
    </AdminProvider>
  );
}
