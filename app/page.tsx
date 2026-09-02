
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Github, Linkedin, Mail, ExternalLink } from 'lucide-react';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20 font-sans">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-8 max-w-7xl mx-auto border-b border-white/5">
        <div className="text-xl font-black tracking-tighter">KING.</div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <a href="#work" className="hover:text-white transition-colors">Work</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-24 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <h1 className="text-7xl md:text-9xl font-bold tracking-tight leading-[0.85] mb-8">
            CRAFTING <br />
            <span className="text-zinc-600 italic font-light">DIGITAL</span> SPACES.
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed max-w-2xl font-light">
            I build high-performance web experiences with a focus on luxury aesthetics and technical precision.
          </p>
          
          <div className="mt-12 flex flex-wrap gap-6 items-center">
            <button className="bg-white text-black px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
              Explore My Projects <ArrowUpRight size={20} />
            </button>
            <div className="flex gap-6 text-zinc-500">
              <Github className="hover:text-white cursor-pointer transition-colors" />
              <Linkedin className="hover:text-white cursor-pointer transition-colors" />
              <Mail className="hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>
        </motion.div>
      </main>

      {/* Projects Grid */}
      <section id="work" className="border-t border-white/5 py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <h2 className="text-4xl font-bold tracking-tighter">SELECTED WORK</h2>
            <span className="text-zinc-600 text-sm font-mono uppercase tracking-widest">01 — 03</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Project Card 1 */}
            <motion.div whileHover={{ y: -10 }} className="group relative cursor-pointer">
              <div className="aspect-[16/10] bg-zinc-900 rounded-3xl overflow-hidden mb-6">
                <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-900 group-hover:scale-110 transition-transform duration-700 flex items-center justify-center">
                   <span className="text-zinc-700 font-bold text-6xl">01</span>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2">King Fitouts Revamp</h3>
                  <p className="text-zinc-500">Interior Design / Full Stack Development</p>
                </div>
                <ExternalLink size={24} className="text-zinc-700" />
              </div>
            </motion.div>

            {/* Project Card 2 */}
            <motion.div whileHover={{ y: -10 }} className="group relative cursor-pointer">
              <div className="aspect-[16/10] bg-zinc-900 rounded-3xl overflow-hidden mb-6">
                <div className="w-full h-full bg-gradient-to-tr from-zinc-800 to-zinc-900 group-hover:scale-110 transition-transform duration-700 flex items-center justify-center">
                   <span className="text-zinc-700 font-bold text-6xl">02</span>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Luxury Ecommerce</h3>
                  <p className="text-zinc-500">UI Design / Stripe Integration</p>
                </div>
                <ExternalLink size={24} className="text-zinc-700" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-500 mb-4 uppercase tracking-[0.3em] text-xs">Ready to start a project?</p>
          <h2 className="text-5xl md:text-7xl font-bold hover:text-zinc-600 transition-colors cursor-pointer">hello@yourname.com</h2>
        </div>
      </footer>
    </div>
  );
}