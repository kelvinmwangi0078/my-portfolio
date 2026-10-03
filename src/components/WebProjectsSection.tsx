import React, { useEffect, useState } from 'react';
import { WebProject } from '../types/portfolio';
import { INITIAL_WEB_PROJECTS } from '../data/portfolioData';
import { ExternalLink, Plus, Globe, Code2, Check, X, Trash2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface WebProjectsSectionProps {
  theme: 'dark' | 'light';
}

// Vite bundles this image, so it also works on the live site (not only on localhost).
// This file is in src/components, so the path goes up one level to src/assets.
const DEFAULT_PREVIEW_IMAGE = new URL(
  '../assets/images/kimc_website_preview_1791048017903.jpg',
  import.meta.url
).href;

// Convert a row from /api/websites into a WebProject
const fromApi = (r: any): WebProject => ({
  id: r.id,
  title: r.title,
  url: r.url,
  description: r.description || '',
  technologies: Array.isArray(r.technologies) ? r.technologies : [],
  image: r.image_url || DEFAULT_PREVIEW_IMAGE,
  role: r.role || '',
  year: r.year || '',
  isUserAdded: true
});

export const WebProjectsSection: React.FC<WebProjectsSectionProps> = ({ theme }) => {
  const { isAdmin } = useAdmin();
  const [customWebsites, setCustomWebsites] = useState<WebProject[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newRole] = useState('Full-Stack Web Developer');
  const [addSuccess, setAddSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load websites from the database so every device sees the same list
  const loadWebsites = async () => {
    try {
      const res = await fetch('/api/websites');
      if (!res.ok) throw new Error('Server returned ' + res.status);
      const rows = await res.json();
      setCustomWebsites(rows.map(fromApi));
    } catch (e) {
      console.error('Error loading websites:', e);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, []);

  // Combine the built-in websites with the ones saved in the database
  const allProjects = [...customWebsites, ...INITIAL_WEB_PROJECTS];

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newUrl) return;

    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const techArray = newTech
      ? newTech.split(',').map((t) => t.trim()).filter(Boolean)
      : ['React', 'TypeScript', 'Web Development'];

    setIsSaving(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'web-' + Date.now(),
          title: newTitle,
          url: formattedUrl,
          description:
            newDescription || 'Full-stack web application developed by Kelvin Mwangi Wambui.',
          technologies: techArray,
          imageUrl: '',
          role: newRole,
          year: new Date().getFullYear().toString()
        })
      });
      if (!res.ok) throw new Error('Server returned ' + res.status);

      await loadWebsites();

      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setIsAddModalOpen(false);
        setNewTitle('');
        setNewUrl('');
        setNewDescription('');
        setNewTech('');
      }, 700);
    } catch (err) {
      console.error('Could not save website:', err);
      setErrorMessage('Could not save the website. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/websites/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Server returned ' + res.status);
      setCustomWebsites((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Could not delete website:', err);
    }
  };

  return (
    <section
      id="web-dev"
      className="py-20 border-t transition-colors duration-200"
      style={{
        borderColor: theme === 'dark' ? '#1E2232' : '#E5E7EB'
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-2">
              <Code2 className="w-3.5 h-3.5" />
              <span>Part 2 · Live Web Development Applications</span>
              <span aria-hidden="true">·</span>
              <span>{allProjects.length} Deployed Platforms</span>
            </div>
            <h2
              className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Web Development Projects
            </h2>
            <p
              className={`mt-2 text-sm sm:text-base max-w-2xl ${
                theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Live production web applications engineered with responsive frontend architecture,
              database systems, and verified security. Click "Visit Live Website" to view each
              deployment.
            </p>
          </div>

          {/* Action: Add Website Link Button (Owner Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Website</span>
              </button>
            </div>
          )}
        </div>

        {/* Website Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allProjects.map((project) => (
            <div
              key={project.id}
              className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${
                theme === 'dark'
                  ? 'bg-[#12141F] border-[#232635] hover:border-[#383D55] shadow-lg'
                  : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Card Header & Preview Frame */}
              <div className="relative aspect-16/10 overflow-hidden bg-neutral-900 border-b border-neutral-800/40">
                <img
                  src={project.image}
                  alt={project.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* Top Badge & Delete if user-added */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-black/60 text-white backdrop-blur-xs flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-[#E2B714]" />
                    <span>Live on Vercel</span>
                  </span>

                  {isAdmin && project.isUserAdded && (
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      title="Remove website"
                      className="p-1.5 rounded-lg bg-black/60 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bottom URL highlight */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                  <div className="font-bold text-sm text-[#E2B714] truncate pr-2">
                    {project.title}
                  </div>
                  <span className="text-white/70 text-[11px] shrink-0">{project.year}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">{project.role}</div>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${
                      theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'
                    }`}
                  >
                    {project.description}
                  </p>
                </div>

                {/* Technologies */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        theme === 'dark'
                          ? 'bg-[#0E1018] text-neutral-300 border border-[#232635]'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Card Action Footer: Direct Live Link Button */}
                <div
                  className={`pt-4 border-t flex items-center justify-between ${
                    theme === 'dark' ? 'border-[#1F2333]' : 'border-neutral-100'
                  }`}
                >
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors flex items-center justify-center gap-2 shadow-sm font-medium"
                  >
                    <span>Visit Live Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Website Link Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)} />

            <div
              className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 z-10 ${
                theme === 'dark'
                  ? 'bg-[#0E1018] border-[#252839] text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800/40 mb-5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#E2B714]" />
                  <h3 className="font-bold text-base">Add Live Website Project</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800/40 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base">Website Added to Portfolio!</h4>
                  <p className="text-xs text-neutral-400">
                    Your live link is now visible in the showcase.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddWebsite} className="space-y-4">
                  {/* Website Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">
                      Website Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. KIMC Student Portal"
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark'
                          ? 'bg-[#12141F] border-[#252839] text-white'
                          : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Live URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">
                      Live Website URL
                    </label>
                    <input
                      type="text"
                      required
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://your-site.vercel.app"
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark'
                          ? 'bg-[#12141F] border-[#252839] text-white'
                          : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Overview of the website, its core features, and client purpose..."
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark'
                          ? 'bg-[#12141F] border-[#252839] text-white'
                          : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {/* Technologies */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-400">
                      Technologies (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newTech}
                      onChange={(e) => setNewTech(e.target.value)}
                      placeholder="e.g. React, TypeScript, Tailwind CSS, Vercel"
                      className={`w-full py-2 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark'
                          ? 'bg-[#12141F] border-[#252839] text-white'
                          : 'bg-neutral-50 border-neutral-300'
                      }`}
                    />
                  </div>

                  {errorMessage && <p className="text-xs text-rose-400">{errorMessage}</p>}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Add Website to Showcase'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};