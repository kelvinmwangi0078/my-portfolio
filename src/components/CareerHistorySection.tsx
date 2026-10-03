import React from 'react';
import { COURSEWORK_INFO, CAREER_EXPERIENCES, CORE_COMPETENCIES } from '../data/portfolioData';
import { Briefcase, CheckCircle2, Sparkles, Building2, BookOpen } from 'lucide-react';

interface CareerHistorySectionProps {
  theme: 'dark' | 'light';
}

export const CareerHistorySection: React.FC<CareerHistorySectionProps> = ({ theme }) => {
  return (
    <section id="career" className="py-20 border-t transition-colors duration-200" style={{
      borderColor: theme === 'dark' ? '#1E2232' : '#E5E7EB'
    }}>
      <div className="max-w-7xl mx-auto px-6 space-y-14">
        {/* Section Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Professional Record & Credentials</span>
            <span aria-hidden="true">·</span>
            <span>Career History</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-neutral-950'
          }`}>
            Work Experience & Core Competencies
          </h2>
          <p className={`mt-2 text-sm sm:text-base max-w-2xl ${
            theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            Hands-on professional experience in creative media, graphic communications, and system development across recognized organizations in Kenya.
          </p>
        </div>

        {/* 1. Work Experience Timeline */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714]">
            <Building2 className="w-4 h-4" />
            <span>Industry Work Experience & Attachments</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CAREER_EXPERIENCES.map((exp, index) => (
              <div
                key={index}
                className={`p-7 rounded-2xl border flex flex-col justify-between ${
                  theme === 'dark' ? 'bg-[#12141F] border-[#232635] shadow-lg' : 'bg-white border-neutral-200 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span className="font-semibold text-[#E2B714]">{exp.period}</span>
                    <span>{exp.location}</span>
                  </div>

                  <h3 className="text-xl font-bold">{exp.company}</h3>
                  <div className="text-xs font-semibold text-neutral-300 mt-1 mb-4">
                    {exp.role}
                  </div>

                  <ul className="space-y-2.5">
                    {exp.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-400 leading-relaxed">
                        <span className="text-[#E2B714] font-bold shrink-0 mt-0.5">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Specialized Coursework & Key Learning Areas */}
        <div className={`p-8 rounded-2xl border ${
          theme === 'dark' ? 'bg-[#12141F] border-[#232635]' : 'bg-white border-neutral-200 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-neutral-800/30">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-1">
                <BookOpen className="w-4 h-4" />
                <span>Technical Foundation</span>
              </div>
              <h3 className="text-xl font-bold">{COURSEWORK_INFO.title}</h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Comprehensive training spanning full-stack systems architecture, database management, and creative design.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 max-w-lg">
              {COURSEWORK_INFO.courseworkList.map((course, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${
                    theme === 'dark'
                      ? 'bg-[#0E1018] border-[#222534] text-neutral-300'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                  }`}
                >
                  {course}
                </span>
              ))}
            </div>
          </div>

          {/* Key Learning Areas */}
          <div className="pt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-4">
              Key Learning Areas & Responsibilities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COURSEWORK_INFO.keyLearningAreas.map((area, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    theme === 'dark' ? 'bg-[#0E1018] border-[#1F2333]' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-[#E2B714] shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {area}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Core Competencies */}
        <div className={`p-8 rounded-2xl border ${
          theme === 'dark' ? 'bg-[#12141F] border-[#232635]' : 'bg-white border-neutral-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E2B714] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Professional Strengths</span>
          </div>
          <h3 className="text-2xl font-bold mb-6">Core Competencies</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CORE_COMPETENCIES.map((comp, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#0E1018] border-[#1F2333]' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="font-semibold text-xs text-white mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E2B714]" />
                  <span>{comp.title}</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {comp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
