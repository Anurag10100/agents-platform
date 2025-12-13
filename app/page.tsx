'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { skills, Skill } from './skills-data';
import styles from './page.module.css';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  base64?: string;
  type: 'image' | 'pdf';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string; // Short summary for assistant messages
}

interface StreamingState {
  isStreaming: boolean;
  charCount: number;
  startTime: number | null;
  charsPerSecond: number;
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
  const [urlContent, setUrlContent] = useState<string>('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    charCount: 0,
    startTime: null,
    charsPerSecond: 0,
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const outputContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (!showScrollToBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showScrollToBottom]);

  // Auto-scroll output during streaming
  useEffect(() => {
    if (streamingState.isStreaming && outputContentRef.current) {
      outputContentRef.current.scrollTop = outputContentRef.current.scrollHeight;
    }
  }, [output?.content, streamingState.isStreaming]);

  // Handle chat scroll to detect if user scrolled up
  const handleChatScroll = () => {
    if (chatHistoryRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatHistoryRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollToBottom(!isNearBottom);
    }
  };

  const scrollChatToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  // Generate summary from content changes
  const generateChangeSummary = (oldContent: string, newContent: string): string => {
    const oldLength = oldContent.length;
    const newLength = newContent.length;
    const diff = newLength - oldLength;

    if (diff > 500) return `Added ~${Math.round(diff / 100) * 100} characters of content`;
    if (diff < -500) return `Removed ~${Math.round(Math.abs(diff) / 100) * 100} characters`;
    if (diff > 0) return 'Expanded and refined the content';
    if (diff < 0) return 'Condensed and tightened the content';
    return 'Refined and adjusted the content';
  };

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

  // Fetch URL content
  const fetchUrlContent = async (url: string) => {
    if (!url || !url.startsWith('http')) return;

    setIsFetchingUrl(true);
    try {
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (response.ok && result.content) {
        setUrlContent(result.content);
      }
    } catch (error) {
      console.error('Failed to fetch URL:', error);
    }
    setIsFetchingUrl(false);
  };

  // Watch for sourceUrl changes
  useEffect(() => {
    const sourceUrl = formData[activeSkill?.id]?.sourceUrl;
    if (sourceUrl && sourceUrl.startsWith('http')) {
      const debounce = setTimeout(() => fetchUrlContent(sourceUrl), 1000);
      return () => clearTimeout(debounce);
    } else {
      setUrlContent('');
    }
  }, [formData, activeSkill?.id]);

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

  // Stream response handler with progress tracking
  const streamResponse = async (
    systemPrompt: string,
    userPrompt: string,
    images: any[],
    onChunk: (text: string) => void
  ) => {
    const startTime = Date.now();
    setStreamingState({
      isStreaming: true,
      charCount: 0,
      startTime,
      charsPerSecond: 0,
    });

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        images: images.length > 0 ? images : undefined,
      }),
    });

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  content += parsed.text;
                  onChunk(content);

                  // Update streaming progress
                  const elapsed = (Date.now() - startTime) / 1000;
                  setStreamingState({
                    isStreaming: true,
                    charCount: content.length,
                    startTime,
                    charsPerSecond: elapsed > 0 ? Math.round(content.length / elapsed) : 0,
                  });
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Streaming complete
      setStreamingState(prev => ({ ...prev, isStreaming: false }));
      return content;
    } else {
      const result = await response.json();
      setStreamingState(prev => ({ ...prev, isStreaming: false }));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }
      onChunk(result.content);
      return result.content;
    }
  };

  const generate = async () => {
    if (!activeSkill) return;

    setIsLoading(true);
    setOutput(null);
    setChatMessages([]);

    try {
      const data = formData[activeSkill.id] || {};

      // Build file context for the prompt
      let fileContext = '';
      const imageContents: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = [];

      for (const uploadedFile of uploadedFiles) {
        if (uploadedFile.type === 'image' && uploadedFile.base64) {
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
        }
      }

      if (uploadedFiles.length > 0) {
        fileContext = `\n\n## ATTACHED FILES (${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}):\n${uploadedFiles.map(f => `- ${f.file.name} (${f.type.toUpperCase()})`).join('\n')}\n\nPlease analyze and incorporate the content from these attached files as context for your response.`;
      }

      // Add URL content if available
      let urlContext = '';
      if (urlContent) {
        urlContext = `\n\n## WEBSITE CONTENT FROM ${data.sourceUrl}:\n\n${urlContent}\n\n---\n\nUse the above website content as the primary source for generating the output.`;
      }

      const userPrompt = activeSkill.buildPrompt(data, customInstructions.trim()) + fileContext + urlContext;

      setOutput({ content: '', format: activeSkill.outputFormat });
      setCurrentView(activeSkill.outputFormat === 'html' ? 'preview' : 'code');

      const finalContent = await streamResponse(
        activeSkill.systemPrompt,
        userPrompt,
        imageContents,
        (content) => setOutput({ content, format: activeSkill.outputFormat })
      );

      // Store initial generation in chat history
      setChatMessages([
        { role: 'assistant', content: finalContent }
      ]);

    } catch (err: any) {
      setOutput({
        content: `Error: ${err.message}`,
        format: 'text',
      });
    }

    setIsLoading(false);
  };

  // Chat for iterative tweaks
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !output || isChatLoading) return;

    const userMessage = chatInput.trim();
    const previousContent = output.content;
    setChatInput('');
    setIsChatLoading(true);

    // Add user message to chat
    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: userMessage }
    ];
    setChatMessages(newMessages);

    try {
      // Build conversation context
      const conversationContext = newMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const tweakPrompt = `Here is our conversation so far:

${conversationContext}

The user wants to modify the output. Their latest request is:
"${userMessage}"

Please provide an updated version of the content based on their feedback. Maintain the same format (${activeSkill?.outputFormat.toUpperCase()}).`;

      let newContent = '';
      await streamResponse(
        activeSkill?.systemPrompt || '',
        tweakPrompt,
        [],
        (content) => {
          newContent = content;
          setOutput({ content, format: activeSkill?.outputFormat || 'text' });
        }
      );

      // Generate a helpful summary of changes
      const summary = generateChangeSummary(previousContent, newContent);

      // Add assistant response to chat with summary
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: newContent, summary }
      ]);

    } catch (err: any) {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: `Error: ${err.message}`, summary: 'Error occurred' }
      ]);
    }

    setIsChatLoading(false);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
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
    setUrlContent('');
    setChatMessages([]);
    setChatInput('');
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
                      {field.name === 'sourceUrl' && isFetchingUrl && (
                        <span className={styles.fetchingBadge}>Fetching...</span>
                      )}
                      {field.name === 'sourceUrl' && urlContent && !isFetchingUrl && (
                        <span className={styles.successBadge}>✓ Loaded</span>
                      )}
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

            <div className={styles.outputContent} ref={outputContentRef}>
              {/* Streaming Progress Indicator */}
              {streamingState.isStreaming && (
                <div className={styles.streamingIndicator}>
                  <div className={styles.streamingPulse} />
                  <div className={styles.streamingInfo}>
                    <span className={styles.streamingLabel}>Generating...</span>
                    <span className={styles.streamingStats}>
                      {streamingState.charCount.toLocaleString()} chars
                      {streamingState.charsPerSecond > 0 && (
                        <> · {streamingState.charsPerSecond} chars/sec</>
                      )}
                    </span>
                  </div>
                  <div className={styles.streamingProgress}>
                    <div className={styles.streamingProgressBar} />
                  </div>
                </div>
              )}

              {output ? (
                <>
                  <div className={styles.outputPreview}>
                    {output.format === 'html' && currentView === 'preview' ? (
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
                    )}
                  </div>

                  {/* Chat Interface for Tweaks */}
                  {output.content && !isLoading && (
                    <div className={`${styles.chatSection} ${chatExpanded ? styles.chatExpanded : ''}`}>
                      <div className={styles.chatHeader}>
                        <div className={styles.chatHeaderLeft}>
                          <span>💬 Refine Output</span>
                          <span className={styles.chatHint}>Ask for changes or adjustments</span>
                        </div>
                        {chatMessages.length > 1 && (
                          <button
                            className={styles.chatExpandBtn}
                            onClick={() => setChatExpanded(!chatExpanded)}
                            title={chatExpanded ? 'Collapse chat' : 'Expand chat'}
                          >
                            {chatExpanded ? '↓' : '↑'}
                          </button>
                        )}
                      </div>

                      {chatMessages.length > 1 && (
                        <div
                          className={styles.chatHistory}
                          ref={chatHistoryRef}
                          onScroll={handleChatScroll}
                        >
                          {chatMessages.slice(1).map((msg, idx) => (
                            <div
                              key={idx}
                              className={`${styles.chatMessage} ${styles[msg.role]}`}
                            >
                              <div className={styles.chatRole}>
                                {msg.role === 'user' ? 'You' : 'AI'}
                              </div>
                              <div className={styles.chatContent}>
                                {msg.role === 'user'
                                  ? msg.content
                                  : (msg.summary || 'Updated the output above ↑')
                                }
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />

                          {/* Scroll to bottom button */}
                          {showScrollToBottom && (
                            <button
                              className={styles.scrollToBottomBtn}
                              onClick={scrollChatToBottom}
                            >
                              ↓ New messages
                            </button>
                          )}
                        </div>
                      )}

                      {/* Streaming indicator in chat */}
                      {isChatLoading && (
                        <div className={styles.chatTypingIndicator}>
                          <div className={styles.typingDots}>
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                          <span>AI is updating the output...</span>
                        </div>
                      )}

                      <div className={styles.chatInput}>
                        <input
                          type="text"
                          placeholder="e.g., Make it shorter, add more stats, change the tone..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          disabled={isChatLoading}
                          className={styles.input}
                        />
                        <button
                          className={styles.chatSendBtn}
                          onClick={sendChatMessage}
                          disabled={isChatLoading || !chatInput.trim()}
                        >
                          {isChatLoading ? (
                            <div className={styles.spinnerSmall} />
                          ) : (
                            '→'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
