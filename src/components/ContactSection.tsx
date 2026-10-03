import React, { useState } from 'react';
import { Mail, Phone, MessageSquare, Linkedin, Copy, Check, Send, Sparkles, Download, ArrowUpRight } from 'lucide-react';

interface ContactSectionProps {
  theme: 'dark' | 'light';
}

export const ContactSection: React.FC<ContactSectionProps> = ({ theme }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contactEmail = 'kelvinmwangi0078@gmail.com';
  const contactPhone = '0712539685';
  const whatsappUrl = 'https://wa.me/254712539685?utm_source=chatgpt.com';
  const linkedinUrl =
    'https://www.linkedin.com/in/kelvin-mwangi-694682360/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BFinyukI%2FSMivROilHAnAag%3D%3D';

  const copyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const copyPhone = () => {
    navigator.clipboard.writeText(contactPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    const emailSubject = encodeURIComponent(subject ? `Inquiry: ${subject}` : `Project Inquiry from ${name || 'Website Visitor'}`);
    const emailBody = encodeURIComponent(
      `Hi Kelvin,\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nSent via Portfolio Contact Form`
    );
    window.location.href = `mailto:${contactEmail}?subject=${emailSubject}&body=${emailBody}`;

    setSubmitted(true);
  };

  const downloadVCard = () => {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
N:Wambui;Kelvin;Mwangi;;
FN:Kelvin Mwangi Wambui
TITLE:Graphic Designer, Photographer & Full-Stack Web Developer
TEL;type=CELL;type=VOICE:+254712539685
EMAIL;type=INTERNET;type=WORK:${contactEmail}
URL:${linkedinUrl}
NOTE:Graphic Design, Web Development, Commercial Photography, Nairobi, Kenya
END:VCARD`;

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Kelvin_Mwangi_Wambui.vcf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="contact"
      className="py-24 border-t transition-colors duration-200"
      style={{ borderColor: theme === 'dark' ? '#1E2232' : '#E5E7EB' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Direct Contact Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Get in Touch</span>
              </div>
              <h2
                className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-neutral-950'
                }`}
              >
                Let’s build something extraordinary.
              </h2>
              <p
                className={`mt-3 text-sm sm:text-base leading-relaxed ${
                  theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'
                }`}
              >
                Feel free to reach out directly via email, phone call, WhatsApp, or connect on LinkedIn. I am always open to new projects, design commissions, and engineering collaborations.
              </p>
            </div>

            {/* Direct Contact Cards */}
            <div className="space-y-3">
              {/* 1. Email */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-[#12141F] border-[#232635]' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#E2B714]/10 text-[#E2B714] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-neutral-400 uppercase font-medium">Email Address</div>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-xs sm:text-sm font-semibold text-[#E2B714] hover:underline truncate block"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>

                <button
                  onClick={copyEmail}
                  title="Copy email"
                  className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#252839] text-neutral-300 hover:text-white hover:bg-[#1A1D2B]'
                      : 'border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
                  }`}
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* 2. Phone Call */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-[#12141F] border-[#232635]' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-neutral-400 uppercase font-medium">Direct Phone Call</div>
                    <a
                      href={`tel:${contactPhone}`}
                      className={`text-xs sm:text-sm font-semibold hover:underline block ${
                        theme === 'dark' ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      {contactPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${contactPhone}`}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-colors"
                  >
                    Call
                  </a>
                  <button
                    onClick={copyPhone}
                    title="Copy phone number"
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'border-[#252839] text-neutral-300 hover:text-white hover:bg-[#1A1D2B]'
                        : 'border-neutral-200 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
                    }`}
                  >
                    {copiedPhone ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3. WhatsApp Direct Chat */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01] ${
                  theme === 'dark'
                    ? 'bg-[#12141F] border-[#232635] hover:border-emerald-500/60'
                    : 'bg-neutral-50 border-neutral-200 hover:border-emerald-500/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-400 uppercase font-medium">Instant Chat</div>
                    <div className="text-xs sm:text-sm font-semibold text-emerald-400 flex items-center gap-1">
                      <span>WhatsApp Direct Message</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                  Online
                </span>
              </a>

              {/* 4. LinkedIn Profile */}
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01] ${
                  theme === 'dark'
                    ? 'bg-[#12141F] border-[#232635] hover:border-blue-500/60'
                    : 'bg-neutral-50 border-neutral-200 hover:border-blue-500/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/15 text-blue-400 flex items-center justify-center shrink-0">
                    <Linkedin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-neutral-400 uppercase font-medium">LinkedIn Network</div>
                    <div className="text-xs sm:text-sm font-semibold text-blue-400 flex items-center gap-1 truncate">
                      <span>Kelvin Mwangi on LinkedIn</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded bg-blue-500/20 text-blue-400 shrink-0">
                  Connect
                </span>
              </a>
            </div>

            {/* Quick Action: Save VCard */}
            <div className="pt-2">
              <button
                onClick={downloadVCard}
                className={`w-full py-2.5 px-4 text-xs font-medium rounded-xl border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  theme === 'dark'
                    ? 'border-[#252839] bg-[#12141F] text-neutral-300 hover:text-white hover:bg-[#1A1D2B]'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 shadow-xs'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-[#E2B714]" />
                <span>Save Contact Card (.vcf)</span>
              </button>
            </div>
          </div>

          {/* Right Column: Clean Message Form (Target budget & estimated timeline removed) */}
          <div className="lg:col-span-7">
            <div
              className={`p-6 sm:p-8 rounded-2xl border ${
                theme === 'dark'
                  ? 'bg-[#12141F] border-[#232635] shadow-xl'
                  : 'bg-white border-neutral-200 shadow-sm'
              }`}
            >
              <div className="mb-6">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-neutral-950'}`}>
                  Send a Direct Message
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Fill in your details below to send an inquiry or message directly to my inbox.
                </p>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Check className="w-7 h-7" />
                  </div>
                  <h4 className="text-2xl font-bold">Message Dispatched!</h4>
                  <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                    Thank you, {name || 'friend'}. Your message has been prepared for dispatch to {contactEmail}. I will get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-semibold text-[#E2B714] hover:underline cursor-pointer"
                  >
                    Send another message →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-400">Your Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className={`w-full py-2.5 px-3 rounded-lg border text-xs transition-colors focus:outline-none focus:border-[#E2B714] ${
                          theme === 'dark'
                            ? 'bg-[#0E1018] border-[#222534] text-neutral-200 placeholder-neutral-600'
                            : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-400">Your Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={`w-full py-2.5 px-3 rounded-lg border text-xs transition-colors focus:outline-none focus:border-[#E2B714] ${
                          theme === 'dark'
                            ? 'bg-[#0E1018] border-[#222534] text-neutral-200 placeholder-neutral-600'
                            : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-400">Subject / Project Topic</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Website Design & Development / Graphic Commission"
                      className={`w-full py-2.5 px-3 rounded-lg border text-xs transition-colors focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark'
                          ? 'bg-[#0E1018] border-[#222534] text-neutral-200 placeholder-neutral-600'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                      }`}
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-400">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message, project idea, or inquiry here..."
                      className={`w-full py-2.5 px-3 rounded-lg border text-xs transition-colors focus:outline-none focus:border-[#E2B714] ${
                        theme === 'dark'
                          ? 'bg-[#0E1018] border-[#222534] text-neutral-200 placeholder-neutral-600'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E2B714] text-neutral-950 hover:bg-[#F0C52B] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>Send Message</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
