'use client';

import { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showVariableHelper?: boolean;
  availableVariables?: string[];
  maxLength?: number;
}

const DEFAULT_VARIABLES = [
  { key: '{recipient_name}', label: 'Recipient Name', description: 'Name of the recipient' },
  { key: '{due_date}', label: 'Due Date', description: 'Due date of the request' },
  { key: '{request_type}', label: 'Request Type', description: 'Type of document requested' },
];

export default function RichTextEditor({
  value,
  onChange,
  label = 'Message Body',
  placeholder = 'Enter your message...',
  className = '',
  showVariableHelper = true,
  availableVariables = DEFAULT_VARIABLES.map((v) => v.key),
  maxLength,
}: RichTextEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync editor content with value prop (only when value changes externally)
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      // Only update if content actually changed
      const currentContent = editorRef.current.innerHTML || '';
      const newContent = value || '';
      if (currentContent !== newContent) {
        // Save cursor position
        const selection = window.getSelection();
        let range = null;
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0).cloneRange();
        }
        
        editorRef.current.innerHTML = newContent;
        
        // Restore cursor position if possible
        if (range && editorRef.current.firstChild) {
          try {
            selection?.removeAllRanges();
            selection?.addRange(range);
          } catch {
            // If range is invalid, place cursor at end
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current);
            newRange.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }
        }
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertVariable = (variable: string) => {
    // Ensure editor is focused
    if (editorRef.current) {
      editorRef.current.focus();
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selection.anchorNode) {
      // Check if selection is within the editor
      const editor = editorRef.current;
      if (editor && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(variable);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
        return;
      }
    }

    // Fallback: insert at end if no selection
    if (editorRef.current) {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // Collapse to end
      selection?.removeAllRanges();
      selection?.addRange(range);
      const textNode = document.createTextNode(variable);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection?.removeAllRanges();
      selection?.addRange(range);
      handleInput();
    }
  };

  const formatText = (command: string) => {
    // Ensure editor is focused before executing command
    if (editorRef.current) {
      editorRef.current.focus();
    }
    execCommand(command);
  };

  const createLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const formatList = (type: 'ordered' | 'unordered') => {
    // Ensure editor is focused before executing command
    if (editorRef.current) {
      editorRef.current.focus();
    }
    execCommand(type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    // Try to get plain text first (for safety)
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      handleInput();
    } else {
      // Fallback: allow HTML paste but sanitize
      const html = e.clipboardData.getData('text/html');
      if (html && editorRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          // Only allow basic formatting
          const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a'];
          const walker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_ELEMENT,
            null
          );
          const nodesToRemove: Node[] = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (!allowedTags.includes(element.tagName.toLowerCase())) {
                nodesToRemove.push(node);
              }
            }
          }
          nodesToRemove.forEach((n) => n.parentNode?.removeChild(n));
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          range.insertNode(fragment);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          handleInput();
        }
      }
    }
  };

  const [characterCount, setCharacterCount] = useState(0);

  // Calculate character count only on client side
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Get plain text length (without HTML tags)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = value || '';
      setCharacterCount(tempDiv.textContent?.length || 0);
    } else {
      // Fallback for SSR: estimate from value length (will be updated on client)
      setCharacterCount(value?.length || 0);
    }
  }, [value]);

  const displayValue = value || '';

  const ToolbarButton = ({
    onClick,
    ariaLabel,
    children,
    active,
  }: {
    onClick: () => void;
    ariaLabel: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-700
        ${active ? 'bg-gray-200' : ''}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          {maxLength && (
            <span
              className={`text-xs ${
                characterCount > maxLength * 0.9
                  ? 'text-orange-600'
                  : characterCount > maxLength
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {characterCount} / {maxLength}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isPreviewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {!isPreviewMode && (
        <>
          <div className="border border-gray-300 rounded-t-md bg-gray-50 p-1 flex items-center gap-1 flex-wrap">
            <ToolbarButton onClick={() => formatText('bold')} ariaLabel="Bold">
              <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => formatText('italic')} ariaLabel="Italic">
              <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4M8 20h12M9 4l-2 16" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => formatText('underline')} ariaLabel="Underline">
              <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v8a6 6 0 0012 0V4M4 20h16" />
              </svg>
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton onClick={() => formatList('unordered')} ariaLabel="Bullet List">
              <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => formatList('ordered')} ariaLabel="Numbered List">
              <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={createLink} ariaLabel="Insert Link">
              <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </ToolbarButton>
          </div>

          {showVariableHelper && (
            <div className="border-x border-gray-300 bg-gray-50 px-2 py-1.5 text-xs">
              <span className="text-gray-600 mr-2">Variables:</span>
              {DEFAULT_VARIABLES.filter((v) => availableVariables.includes(v.key)).map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  className="mr-2 text-blue-600 hover:text-blue-800 hover:underline"
                  title={variable.description}
                >
                  {variable.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {isPreviewMode ? (
        <div
          className="min-h-[150px] rounded-b-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          dangerouslySetInnerHTML={{ __html: displayValue || '<p class="text-gray-400">No content</p>' }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onBlur={handleInput}
          className="min-h-[150px] rounded-b-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          role="textbox"
          aria-label={label}
        />
      )}

      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}

