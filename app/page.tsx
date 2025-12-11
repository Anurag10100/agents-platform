'use client';

import { useState } from 'react';
import { skills, Skill } from './skills-data';
import styles from './page.module.css';

export default function Home() {
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<{ content: string; format: string } | null>(null);
  const [currentView, setCurrentView] = useState<'preview' | 'code'>('preview');
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const updateField = (skillId: string, fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [skillId]: {
        ...prev[skillId],
        [fieldName]: value,
      },
    }));
  };

  const toggleMulti = (skillId: string, fieldName: string, value: string) => {
    const current = formData[skillId]?.[fieldName] || [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    updateField(skillId, fieldName, updated);
  };

  const addSuggestion = (text: string) => {
    const current = customInstructions.trim();
    setCustomInstructions(current ? `${current}\n• ${text}` : `• ${text}`);
  };

  const generate = async () => {
    if (!activeSkill) return;

    setIsLoading(true);
    setOutput(null);

    try {
      const data = formData[activeSkill.id] || {};
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: activeSkill.systemPrompt,
          userPrompt: activeSkill.buildPrompt(data, customInstructions.trim()),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }

      setOutput({
        content: result.content,
        format: activeSkill.outputFormat,
      });
      setCurrentView(activeSkill.outputFormat === 'html' ? 'preview' : 'code');
    } catch (err: any) {
      setOutput({
        content: `Error: ${err.message}`,
        format: 'text',
      });
    }

    setIsLoading(false);
  };

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output.content);
    }
  };

  const downloadOutput = () => {
    if (!output || !activeSkill) return;

    const ext = output.format === 'html' ? 'html' : 'md';
    const mimeType = output.format === 'html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([output.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSkill.id}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openSkill = (skill: Skill) => {
    setActiveSkill(skill);
    setOutput(null);
    setCustomExpanded(false);
    setCustomInstructions(formData[skill.id]?.customInstructions || '');
    document.documentElement.style.setProperty('--accent', skill.color);
    document.documentElement.style.setProperty('--accent-bg', `${skill.color}20`);
    document.documentElement.style.setProperty('--accent-glow', `${skill.color}30`);
  };

  const closeModal = () => {
    setActiveSkill(null);
    setOutput(null);
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>');
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <div className={styles.logo}>ELETS SKILLS HUB</div>
            <div className={styles.logoSub}>AI CONTENT GENERATOR</div>
          </div>
          <div className={styles.badge}>● {skills.length} Skills Active</div>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1>Generate Content Instantly</h1>
          <p>
            Select a skill, configure parameters, add custom instructions, and get
            publication-ready outputs in seconds.
          </p>
        </div>

        <div className={styles.grid}>
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={styles.card}
              onClick={() => openSkill(skill)}
              style={{ '--card-accent': skill.color } as React.CSSProperties}
            >
              <div
                className={styles.glow}
                style={{ background: skill.gradient }}
              />
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <div
                    className={styles.cardIcon}
                    style={{
                      background: skill.gradient,
                      boxShadow: `0 6px 20px ${skill.color}40`,
                    }}
                  >
                    {skill.icon}
                  </div>
                  <div>
                    <div className={styles.cardTitle}>{skill.name}</div>
                    <div
                      className={styles.cardFormat}
                      style={{ color: skill.color }}
                    >
                      Output: {skill.outputFormat.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className={styles.cardDesc}>{skill.description}</div>
                <div className={styles.cardCta} style={{ color: skill.color }}>
                  Generate Now →
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {activeSkill && (
        <div className={styles.modal} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={`${styles.modalBox} ${output ? styles.expanded : styles.compact}`}>
            {/* Form Panel */}
            <div className={styles.formPanel}>
              <div
                className={styles.modalHeader}
                style={{ background: activeSkill.gradient }}
              >
                <div className={styles.modalIcon}>{activeSkill.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className={styles.modalTitle}>{activeSkill.name}</div>
                  <div className={styles.modalSubtitle}>
                    Generates {activeSkill.outputFormat.toUpperCase()}
                  </div>
                </div>
                <button className={styles.closeBtn} onClick={closeModal}>
                  ×
                </button>
              </div>

              <div className={styles.formBody}>
                {/* Form Fields */}
                {activeSkill.fields.map((field) => (
                  <div key={field.name} className={styles.field}>
                    <label className={styles.label}>
                      {field.label}
                      {field.required && <span className={styles.required}>*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={formData[activeSkill.id]?.[field.name] || ''}
                        onChange={(e) =>
                          updateField(activeSkill.id, field.name, e.target.value)
                        }
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder}
                        value={formData[activeSkill.id]?.[field.name] || ''}
                        onChange={(e) =>
                          updateField(activeSkill.id, field.name, e.target.value)
                        }
                      />
                    ) : field.type === 'multiselect' ? (
                      <div className={styles.multiSelect}>
                        {field.options?.map((opt) => {
                          const selected = (
                            formData[activeSkill.id]?.[field.name] || []
                          ).includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`${styles.multiBtn} ${selected ? styles.selected : ''}`}
                              onClick={() =>
                                toggleMulti(activeSkill.id, field.name, opt)
                              }
                            >
                              {selected ? '✓ ' : ''}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[activeSkill.id]?.[field.name] || ''}
                        onChange={(e) =>
                          updateField(activeSkill.id, field.name, e.target.value)
                        }
                      />
                    )}
                  </div>
                ))}

                {/* Custom Instructions Section */}
                <div className={styles.customSection}>
                  <div className={styles.customHeader}>
                    <div
                      className={styles.customToggle}
                      onClick={() => setCustomExpanded(!customExpanded)}
                    >
                      <div className={styles.customToggleIcon}>✨</div>
                      <div>
                        <div className={styles.customToggleText}>
                          Custom Instructions
                        </div>
                        <div className={styles.customToggleHint}>
                          Add specific requirements or context
                        </div>
                      </div>
                    </div>
                    <button
                      className={styles.expandBtn}
                      onClick={() => setCustomExpanded(!customExpanded)}
                    >
                      {customExpanded ? '− Hide' : '+ Add'}
                    </button>
                  </div>

                  {customExpanded && (
                    <div className={styles.customContent}>
                      <textarea
                        className={styles.customTextarea}
                        placeholder={`Add any specific instructions, requirements, or context...

Examples:
• Include specific data points or statistics
• Mention certain people or organizations
• Use a particular writing style or tone
• Focus on specific aspects of the topic`}
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                      />
                      <div className={styles.charCounter}>
                        {customInstructions.length} / 1000 characters
                      </div>

                      <div className={styles.customSuggestions}>
                        {activeSkill.customSuggestions.map((s) => (
                          <span
                            key={s}
                            className={styles.suggestionChip}
                            onClick={() => addSuggestion(s)}
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className={styles.customExamples}>
                        <div className={styles.customExamplesTitle}>
                          💡 Suggestions for this skill
                        </div>
                        <div className={styles.customExamplesList}>
                          {activeSkill.customExamples}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className={styles.generateBtn}
                  onClick={generate}
                  disabled={isLoading}
                  style={{ background: activeSkill.gradient }}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" />
                      Generating...
                    </>
                  ) : (
                    'Generate Content ✨'
                  )}
                </button>
              </div>
            </div>

            {/* Output Panel */}
            {output && (
              <div className={styles.outputPanel}>
                <div className={styles.outputHeader}>
                  <span className={styles.outputLabel}>Generated Output</span>

                  {output.format === 'html' && (
                    <div className={styles.viewToggle}>
                      <button
                        className={`${styles.viewBtn} ${currentView === 'preview' ? styles.active : ''}`}
                        onClick={() => setCurrentView('preview')}
                      >
                        Preview
                      </button>
                      <button
                        className={`${styles.viewBtn} ${currentView === 'code' ? styles.active : ''}`}
                        onClick={() => setCurrentView('code')}
                      >
                        Code
                      </button>
                    </div>
                  )}

                  <button
                    className={`${styles.actionBtn} ${styles.secondary}`}
                    onClick={copyOutput}
                  >
                    📋 Copy
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.primary}`}
                    onClick={downloadOutput}
                  >
                    ⬇️ Download
                  </button>
                </div>

                <div className={styles.outputContent}>
                  {output.format === 'html' && currentView === 'preview' ? (
                    <div className={styles.previewFrame}>
                      <iframe
                        srcDoc={output.content}
                        title="Preview"
                        style={{ width: '100%', minHeight: '600px', border: 'none' }}
                      />
                    </div>
                  ) : output.format === 'markdown' ? (
                    <div
                      className={styles.markdownView}
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(output.content),
                      }}
                    />
                  ) : (
                    <pre className={styles.codeView}>{output.content}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        Elets Technomedia Skills Hub • Powered by Claude AI
        <br />
        Content generation for eGov, eHealth, BFSI & Education
      </footer>
    </div>
  );
}
