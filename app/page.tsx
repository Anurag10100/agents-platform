'use client';

import { useState, useRef, useCallback } from 'react';
import { skills, Skill } from './skills-data';
import styles from './page.module.css';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  base64?: string;
  type: 'image' | 'pdf';
}

export default function Home() {
  const [activeSkill, setActiveSkill] = useState<Skill>(skills[0]);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<{ content: string; format: string } | null>(null);
  const [currentView, setCurrentView] = useState<'preview' | 'code'>('preview');
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // File upload handlers
  const processFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      alert('Please upload images (PNG, JPG, WebP) or PDF files only.');
      return null;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB.');
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          base64,
          type: isImage ? 'image' : 'pdf',
          preview: isImage ? base64 : undefined,
        };
        resolve(uploadedFile);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const processed = await processFile(files[i]);
      if (processed) {
        newFiles.push(processed);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const generate = async () => {
    if (!activeSkill) return;

    setIsLoading(true);
    setOutput(null);

    try {
      const data = formData[activeSkill.id] || {};

      // Build file context for the prompt
      let fileContext = '';
      const imageContents: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = [];
      const pdfContents: Array<{ data: string; name: string }> = [];

      for (const uploadedFile of uploadedFiles) {
        if (uploadedFile.type === 'image' && uploadedFile.base64) {
          // Extract base64 data and media type
          const matches = uploadedFile.base64.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            imageContents.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: matches[1],
                data: matches[2],
              },
            });
          }
        } else if (uploadedFile.type === 'pdf' && uploadedFile.base64) {
          // Extract base64 data for PDF
          const matches = uploadedFile.base64.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            pdfContents.push({
              data: matches[2],
              name: uploadedFile.file.name,
            });
          }
        }
      }

      if (uploadedFiles.length > 0) {
        fileContext = `\n\n## ATTACHED FILES (${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}):\n${uploadedFiles.map(f => `- ${f.file.name} (${f.type.toUpperCase()})`).join('\n')}\n\nPlease analyze and incorporate the content from these attached files as context for your response.`;
      }

      const userPrompt = activeSkill.buildPrompt(data, customInstructions.trim()) + fileContext;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: activeSkill.systemPrompt,
          userPrompt,
          images: imageContents.length > 0 ? imageContents : undefined,
          pdfs: pdfContents.length > 0 ? pdfContents : undefined,
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

  const selectSkill = (skill: Skill) => {
    setActiveSkill(skill);
    setOutput(null);
    setCustomExpanded(false);
    setCustomInstructions(formData[skill.id]?.customInstructions || '');
    setUploadedFiles([]);
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

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>S</div>
            <span className={styles.logoText}>Skills Hub</span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>Content Generation</div>
            {skills.map((skill) => (
              <button
                key={skill.id}
                className={`${styles.navItem} ${activeSkill?.id === skill.id ? styles.active : ''}`}
                onClick={() => selectSkill(skill)}
              >
                <span className={styles.navIcon}>{skill.icon}</span>
                <span className={styles.navLabel}>{skill.name}</span>
                <span className={styles.navBadge}>{skill.outputFormat.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.headerBreadcrumb}>Skills /</span>
            <span>{activeSkill?.name}</span>
          </div>
          <div className={styles.headerSpacer} />
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Form Panel */}
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>{activeSkill?.name}</h2>
              <p className={styles.formSubtitle}>{activeSkill?.description}</p>
            </div>

            <div className={styles.formBody}>
              {/* File Upload Section */}
              <div className={styles.formSection}>
                <div className={styles.formSectionTitle}>Context Files</div>
                <div className={styles.fileUpload}>
                  <div
                    className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={styles.dropZoneIcon}>📎</div>
                    <div className={styles.dropZoneText}>
                      Drop files here or click to upload
                    </div>
                    <div className={styles.dropZoneHint}>
                      Images (PNG, JPG, WebP) or PDF files up to 20MB
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />

                  {uploadedFiles.length > 0 && (
                    <div className={styles.fileList}>
                      {uploadedFiles.map((uploadedFile) => (
                        <div key={uploadedFile.id} className={styles.fileItem}>
                          <div className={styles.filePreview}>
                            {uploadedFile.preview ? (
                              <img src={uploadedFile.preview} alt={uploadedFile.file.name} />
                            ) : (
                              <span className={styles.filePreviewIcon}>📄</span>
                            )}
                          </div>
                          <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{uploadedFile.file.name}</div>
                            <div className={styles.fileSize}>
                              {formatFileSize(uploadedFile.file.size)}
                            </div>
                          </div>
                          <button
                            className={styles.fileRemove}
                            onClick={() => removeFile(uploadedFile.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className={styles.formSection}>
                <div className={styles.formSectionTitle}>Parameters</div>
                {activeSkill?.fields.map((field) => (
                  <div key={field.name} className={styles.field}>
                    <label className={styles.label}>
                      {field.label}
                      {field.required && <span className={styles.required}>*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        className={styles.select}
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
                        className={styles.textarea}
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
                              className={`${styles.multiOption} ${selected ? styles.selected : ''}`}
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
                        className={styles.input}
                        placeholder={field.placeholder}
                        value={formData[activeSkill.id]?.[field.name] || ''}
                        onChange={(e) =>
                          updateField(activeSkill.id, field.name, e.target.value)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Custom Instructions */}
              <div className={styles.customSection}>
                <div
                  className={styles.customToggle}
                  onClick={() => setCustomExpanded(!customExpanded)}
                >
                  <div className={styles.customToggleLeft}>
                    <div className={styles.customToggleIcon}>✨</div>
                    <div>
                      <div className={styles.customToggleText}>Custom Instructions</div>
                      <div className={styles.customToggleHint}>
                        Add specific requirements
                      </div>
                    </div>
                  </div>
                  <button className={styles.customToggleBtn}>
                    {customExpanded ? 'Hide' : 'Add'}
                  </button>
                </div>

                {customExpanded && (
                  <div className={styles.customContent}>
                    <textarea
                      className={styles.textarea}
                      placeholder="Add any specific instructions, requirements, or context..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      style={{ minHeight: '100px' }}
                    />
                    <div className={styles.suggestions}>
                      {activeSkill?.customSuggestions.map((s) => (
                        <button
                          key={s}
                          className={styles.suggestionChip}
                          onClick={() => addSuggestion(s)}
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button
                className={styles.generateBtn}
                onClick={generate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner} />
                    Generating...
                  </>
                ) : (
                  'Generate Content'
                )}
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className={styles.outputPanel}>
            <div className={styles.outputHeader}>
              <span className={styles.outputTitle}>Output</span>

              {output && output.format === 'html' && (
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

              {output && (
                <div className={styles.outputActions}>
                  <button className={styles.actionBtn} onClick={copyOutput}>
                    Copy
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.primary}`}
                    onClick={downloadOutput}
                  >
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className={styles.outputContent}>
              {output ? (
                output.format === 'html' && currentView === 'preview' ? (
                  <div className={styles.previewFrame}>
                    <iframe
                      srcDoc={output.content}
                      title="Preview"
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
                )
              ) : (
                <div className={styles.outputEmpty}>
                  <div className={styles.outputEmptyIcon}>✨</div>
                  <div className={styles.outputEmptyText}>
                    Ready to generate content
                  </div>
                  <div className={styles.outputEmptyHint}>
                    Fill in the parameters and click &quot;Generate Content&quot;
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
