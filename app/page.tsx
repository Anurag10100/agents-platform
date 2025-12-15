'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { skills, Skill } from './skills-data';
import styles from './page.module.css';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  base64: string;
  type: 'image' | 'pdf';
  preview?: string;
}

interface FetchedUrl {
  url: string;
  title: string;
  content: string;
  images: Array<{
    url: string;
    alt: string;
    base64: string;
    mediaType: string;
  }>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: UploadedFile[];
  urls?: FetchedUrl[];
  outputFormat?: 'html' | 'markdown' | 'text';
  skillUsed?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Extract URLs from text - handles various formats including bare domains
function extractUrls(text: string): string[] {
  // Match URLs with protocol, www, or bare domains like example.com, sub.example.co.in
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s<>"{}|\\^`[\]]*)?/gi;
  const matches = text.match(urlPattern) || [];

  // Filter out common false positives and normalize URLs
  return matches
    .filter(url => {
      // Must have at least one dot and valid TLD-like ending
      const parts = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.');
      if (parts.length < 2) return false;
      const tld = parts[parts.length - 1].toLowerCase();
      // Common TLDs - expand as needed
      const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'in', 'ai', 'dev', 'app', 'xyz', 'info', 'biz', 'online', 'site', 'tech', 'news', 'blog'];
      return validTlds.includes(tld) || tld.length === 2; // 2-letter country codes
    })
    .map(url => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
      }
      return url;
    });
}

// Detect which skill to use based on message content
function detectSkill(message: string): Skill | null {
  const lower = message.toLowerCase();

  // Newsletter keywords
  if (lower.includes('newsletter') || lower.includes('email blast') || lower.includes('morning brew') ||
      lower.includes('digest email') || lower.includes('email newsletter')) {
    return skills.find(s => s.id === 'editorial-newsletter') || null;
  }

  // Research keywords
  if (lower.includes('research') || lower.includes('analyze') || lower.includes('deep dive') ||
      lower.includes('trends') || lower.includes('analysis') || lower.includes('report on')) {
    return skills.find(s => s.id === 'research-agent') || null;
  }

  // Speaker/invitation keywords
  if (lower.includes('speaker') || lower.includes('invitation') || lower.includes('invite') ||
      lower.includes('conference email') || lower.includes('event email') || lower.includes('mailer')) {
    return skills.find(s => s.id === 'speaker-mailer') || null;
  }

  // Daily briefing keywords
  if (lower.includes('daily briefing') || lower.includes('news briefing') || lower.includes('daily news') ||
      lower.includes('sector news') || lower.includes('today\'s news')) {
    return skills.find(s => s.id === 'daily-briefing') || null;
  }

  // Content transformation keywords
  if (lower.includes('transform') || lower.includes('convert to') || lower.includes('make it') ||
      lower.includes('linkedin') || lower.includes('twitter') || lower.includes('thread') ||
      lower.includes('press release') || lower.includes('social media')) {
    return skills.find(s => s.id === 'content-transformer') || null;
  }

  // Presentation keywords
  if (lower.includes('presentation') || lower.includes('slides') || lower.includes('ppt') ||
      lower.includes('deck') || lower.includes('powerpoint')) {
    return skills.find(s => s.id === 'presentation') || null;
  }

  // Default to newsletter for content generation
  return skills.find(s => s.id === 'editorial-newsletter') || null;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentOutput, setCurrentOutput] = useState<{ content: string; format: string } | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'code'>('preview');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fetchingUrls, setFetchingUrls] = useState<Set<string>>(new Set());
  const [fetchedUrls, setFetchedUrls] = useState<Map<string, FetchedUrl>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Fetch URL content
  const fetchUrlContent = async (url: string): Promise<FetchedUrl | null> => {
    try {
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, fetchImages: true }),
      });

      const result = await response.json();
      if (response.ok && result.content) {
        return {
          url: result.url || url,
          title: result.title || url,
          content: result.content,
          images: result.images || [],
        };
      }
    } catch (error) {
      console.error('Failed to fetch URL:', error);
    }
    return null;
  };

  // Process file for upload
  const processFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
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
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          base64,
          type: isImage ? 'image' : 'pdf',
          preview: isImage ? base64 : undefined,
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const processed = await processFile(files[i]);
      if (processed) {
        newFiles.push(processed);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  }, [processFile]);

  // Drag and drop handlers
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

  // Remove attached file
  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Update preview with debouncing
  const updatePreview = useCallback((content: string, force: boolean = false) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    if (force) {
      setPreviewContent(content);
    } else {
      previewTimeoutRef.current = setTimeout(() => {
        setPreviewContent(content);
      }, 300);
    }
  }, []);

  // Stream response from API
  const streamResponse = async (
    systemPrompt: string,
    userPrompt: string,
    images: any[],
    onChunk: (text: string) => void
  ): Promise<string> => {
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
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
      return content;
    } else {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }
      onChunk(result.content);
      return result.content;
    }
  };

  // Send message
  const sendMessage = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Detect URLs in message
    const urls = extractUrls(userMessage);
    const urlsToFetch = urls.filter(url => !fetchedUrls.has(url));

    // Create user message
    const userMsgId = `msg-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setAttachedFiles([]);

    // Fetch URLs if any
    let fetchedUrlData: FetchedUrl[] = [];
    if (urlsToFetch.length > 0) {
      setFetchingUrls(new Set(urlsToFetch));

      const fetchPromises = urlsToFetch.map(async (url) => {
        const data = await fetchUrlContent(url);
        if (data) {
          setFetchedUrls((prev) => new Map(prev).set(url, data));
          return data;
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      fetchedUrlData = results.filter((r): r is FetchedUrl => r !== null);
      setFetchingUrls(new Set());
    }

    // Add already fetched URLs
    for (const url of urls) {
      const cached = fetchedUrls.get(url);
      if (cached && !fetchedUrlData.find(u => u.url === cached.url)) {
        fetchedUrlData.push(cached);
      }
    }

    // Detect skill to use
    const detectedSkill = detectSkill(userMessage);
    const skill = detectedSkill || skills[0];

    // Build prompt
    let fullPrompt = userMessage;

    // Add URL content with strong emphasis to use it
    if (fetchedUrlData.length > 0) {
      const urlContext = fetchedUrlData.map((urlData, idx) => {
        let context = `\n\n### SOURCE ${idx + 1}: ${urlData.title}\nURL: ${urlData.url}\n\n${urlData.content}`;

        // Add image placeholders
        const imagesToEmbed = urlData.images.slice(0, 3);
        if (imagesToEmbed.length > 0) {
          context += `\n\n### Available Images from this source:\n`;
          imagesToEmbed.forEach((img, imgIdx) => {
            context += `- {{IMAGE_${idx + 1}_${imgIdx + 1}}}${img.alt ? ` - ${img.alt}` : ''}\n`;
          });
          context += `\nInclude these image placeholders in your HTML output.`;
        }

        return context;
      }).join('\n\n---\n');

      fullPrompt = `## IMPORTANT INSTRUCTIONS:
You MUST create content based on the ACTUAL website content provided below. Do NOT make up generic content.
Extract real headlines, stories, statistics, quotes, and information from the source material.
The output should reflect what is actually on the website, not placeholder or invented content.

## USER REQUEST:
${userMessage}

## ACTUAL WEBSITE CONTENT TO USE:
${urlContext}

---

Generate the output using ONLY the real content from the website above. Include actual headlines, real statistics, genuine quotes, and true information from the source. Do not invent or placeholder any content.`;
    }

    // Prepare images for API
    const imageContents: any[] = [];

    // Add attached files
    if (newUserMessage.files) {
      for (const file of newUserMessage.files) {
        if (file.type === 'image' && file.base64) {
          const matches = file.base64.match(/^data:(.+);base64,(.+)$/);
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
    }

    // Add URL images
    for (const urlData of fetchedUrlData) {
      for (const img of urlData.images.slice(0, 2)) {
        if (img.base64 && img.mediaType) {
          imageContents.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.base64,
            },
          });
        }
      }
    }

    // Create streaming assistant message
    const assistantMsgId = `msg-${Date.now()}-assistant`;
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      outputFormat: skill.outputFormat,
      skillUsed: skill.name,
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setShowPreview(true);
    setCurrentOutput({ content: '', format: skill.outputFormat });

    // Function to replace image placeholders
    const replaceImagePlaceholders = (html: string): string => {
      let result = html;
      fetchedUrlData.forEach((urlData, urlIdx) => {
        urlData.images.slice(0, 3).forEach((img, imgIdx) => {
          const placeholder = `{{IMAGE_${urlIdx + 1}_${imgIdx + 1}}}`;
          const dataUrl = `data:${img.mediaType};base64,${img.base64}`;
          const imgTag = `<img src="${dataUrl}" alt="${img.alt || 'Image'}" style="max-width:100%;height:auto;display:block;margin:16px auto;border-radius:8px;" />`;
          result = result.split(placeholder).join(imgTag);
        });
      });
      return result;
    };

    try {
      const rawContent = await streamResponse(
        skill.systemPrompt,
        fullPrompt,
        imageContents,
        (content) => {
          const processedContent = replaceImagePlaceholders(content);

          // Update message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: processedContent }
                : msg
            )
          );

          // Update preview
          setCurrentOutput({ content: processedContent, format: skill.outputFormat });
          if (skill.outputFormat === 'html') {
            updatePreview(processedContent, false);
          }
        }
      );

      const finalContent = replaceImagePlaceholders(rawContent);

      // Finalize message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: finalContent, isStreaming: false }
            : msg
        )
      );

      setCurrentOutput({ content: finalContent, format: skill.outputFormat });
      if (skill.outputFormat === 'html') {
        updatePreview(finalContent, true);
      } else {
        setPreviewContent(finalContent);
      }

      // Log generation
      try {
        await fetch('/api/admin/log-generation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skillId: skill.id,
            skillName: skill.name,
            inputData: { message: userMessage },
            sourceUrl: fetchedUrlData[0]?.url,
            outputFormat: skill.outputFormat,
            output: finalContent,
            imagesCount: imageContents.length,
            urlImagesCount: fetchedUrlData.reduce((acc, u) => acc + u.images.length, 0),
            durationMs: Date.now() - newUserMessage.timestamp.getTime(),
            status: 'success',
          }),
        });
      } catch (e) {
        console.error('Failed to log generation:', e);
      }

    } catch (error: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Error: ${error.message}`, isStreaming: false, outputFormat: 'text' }
            : msg
        )
      );
    }

    setIsLoading(false);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Copy output
  const copyOutput = () => {
    if (currentOutput) {
      navigator.clipboard.writeText(currentOutput.content);
    }
  };

  // Download output
  const downloadOutput = () => {
    if (!currentOutput) return;
    const ext = currentOutput.format === 'html' ? 'html' : 'md';
    const mimeType = currentOutput.format === 'html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([currentOutput.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render markdown simply
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Suggestion chips for empty state
  const suggestions = [
    { text: 'Create a newsletter about AI in Healthcare', icon: '📰' },
    { text: 'Research trends in Digital India initiatives', icon: '🔍' },
    { text: 'Write a speaker invitation for tech summit', icon: '✉️' },
    { text: 'Generate daily news briefing for BFSI sector', icon: '☀️' },
  ];

  return (
    <div className={styles.chatLayout}>
      {/* Header */}
      <header className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <div className={styles.chatLogo}>
            <span className={styles.chatLogoIcon}>S</span>
            <span className={styles.chatLogoText}>Skills Hub</span>
          </div>
        </div>
        <div className={styles.chatHeaderRight}>
          <a href="/admin" className={styles.headerLink}>
            Admin
          </a>
          <button className={styles.themeBtn} onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.chatMain}>
        {/* Chat Panel */}
        <div className={`${styles.chatPanel} ${showPreview ? styles.withPreview : ''}`}>
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✨</div>
                <h2 className={styles.emptyTitle}>What would you like to create?</h2>
                <p className={styles.emptySubtitle}>
                  I can help you create newsletters, research reports, speaker invitations, and more.
                  Just describe what you need or paste a URL for reference.
                </p>
                <div className={styles.suggestionGrid}>
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className={styles.suggestionCard}
                      onClick={() => setInputValue(suggestion.text)}
                    >
                      <span className={styles.suggestionIcon}>{suggestion.icon}</span>
                      <span className={styles.suggestionText}>{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.messagesList}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${styles[message.role]}`}
                  >
                    <div className={styles.messageAvatar}>
                      {message.role === 'user' ? '👤' : '✨'}
                    </div>
                    <div className={styles.messageContent}>
                      {message.role === 'user' ? (
                        <>
                          <p className={styles.messageText}>{message.content}</p>
                          {message.files && message.files.length > 0 && (
                            <div className={styles.messageFiles}>
                              {message.files.map((file) => (
                                <div key={file.id} className={styles.messageFile}>
                                  {file.preview ? (
                                    <img src={file.preview} alt={file.name} />
                                  ) : (
                                    <span>📄</span>
                                  )}
                                  <span>{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {message.skillUsed && (
                            <div className={styles.skillBadge}>
                              Using: {message.skillUsed}
                            </div>
                          )}
                          <div className={styles.assistantContent}>
                            {message.outputFormat === 'html' ? (
                              <div className={styles.htmlPreviewMini}>
                                <div className={styles.htmlPreviewLabel}>
                                  HTML Output Generated
                                  {message.isStreaming && <span className={styles.streamingDot} />}
                                </div>
                                <p>View the preview panel on the right to see the rendered output.</p>
                              </div>
                            ) : (
                              <div
                                className={styles.markdownContent}
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(message.content),
                                }}
                              />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div
            className={`${styles.inputContainer} ${isDragOver ? styles.dragOver : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className={styles.attachedFiles}>
                {attachedFiles.map((file) => (
                  <div key={file.id} className={styles.attachedFile}>
                    {file.preview ? (
                      <img src={file.preview} alt={file.name} />
                    ) : (
                      <span className={styles.fileIcon}>📄</span>
                    )}
                    <span className={styles.fileName}>{file.name}</span>
                    <button
                      className={styles.removeFile}
                      onClick={() => removeFile(file.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* URL Fetching Indicator */}
            {fetchingUrls.size > 0 && (
              <div className={styles.fetchingIndicator}>
                <div className={styles.spinner} />
                <div className={styles.fetchingInfo}>
                  <span className={styles.fetchingTitle}>Fetching website content...</span>
                  <span className={styles.fetchingUrl}>{Array.from(fetchingUrls)[0]}</span>
                </div>
              </div>
            )}

            <div className={styles.inputWrapper}>
              <button
                className={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
              >
                📎
              </button>
              <textarea
                ref={textareaRef}
                className={styles.chatInput}
                placeholder="Describe what you want to create, or paste a URL..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
              />
              <button
                className={styles.sendBtn}
                onClick={sendMessage}
                disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}
              >
                {isLoading ? <div className={styles.spinnerSmall} /> : '→'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <div className={styles.inputHint}>
              Press Enter to send, Shift+Enter for new line. Drop files or paste URLs.
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && currentOutput && (
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTabs}>
                <button
                  className={`${styles.previewTab} ${previewTab === 'preview' ? styles.active : ''}`}
                  onClick={() => setPreviewTab('preview')}
                >
                  Preview
                </button>
                <button
                  className={`${styles.previewTab} ${previewTab === 'code' ? styles.active : ''}`}
                  onClick={() => setPreviewTab('code')}
                >
                  Code
                </button>
              </div>
              <div className={styles.previewActions}>
                <button className={styles.previewAction} onClick={copyOutput}>
                  Copy
                </button>
                <button className={styles.previewAction} onClick={downloadOutput}>
                  Download
                </button>
                <button
                  className={styles.previewClose}
                  onClick={() => setShowPreview(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className={styles.previewBody}>
              {previewTab === 'preview' ? (
                currentOutput.format === 'html' ? (
                  <iframe
                    className={styles.previewIframe}
                    srcDoc={previewContent || currentOutput.content}
                    title="Preview"
                  />
                ) : (
                  <div
                    className={styles.previewMarkdown}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(currentOutput.content),
                    }}
                  />
                )
              ) : (
                <pre className={styles.previewCode}>
                  {currentOutput.content}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
