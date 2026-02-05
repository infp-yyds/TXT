import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // First, separate code blocks from the rest of the content
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`markdown-body space-y-4 ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Render Code Block
          const lines = part.split('\n');
          const lang = lines[0].replace('```', '').trim();
          const code = lines.slice(1, -1).join('\n');
          return (
            <div key={index} className="my-4 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
              {lang && <div className="px-4 py-1 bg-zinc-200 text-xs text-zinc-600 font-mono font-bold uppercase">{lang}</div>}
              <pre className="p-4 overflow-x-auto text-sm font-mono text-zinc-800 whitespace-pre-wrap break-all">
                {code}
              </pre>
            </div>
          );
        }
        
        // Render Standard Markdown for non-code blocks
        // We'll process this part line by line
        const lines = part.split('\n');
        
        // Helper to parse inline styles
        const parseInline = (text: string): React.ReactNode[] => {
            const segments = text.split(/(\*\*.*?\*\*|`.*?`)/g);
            return segments.map((segment, i) => {
              if (segment.startsWith('**') && segment.endsWith('**')) {
                return <strong key={i} className="font-semibold text-zinc-900">{segment.slice(2, -2)}</strong>;
              }
              if (segment.startsWith('`') && segment.endsWith('`')) {
                return <code key={i} className="bg-zinc-100 text-pink-600 px-1 py-0.5 rounded text-sm font-mono">{segment.slice(1, -1)}</code>;
              }
              return segment;
            });
        };

        const elements: React.ReactNode[] = [];
        let currentList: React.ReactNode[] = [];
        let listType: 'ul' | 'ol' | null = null;

        const flushList = (keyPrefix: string) => {
            if (currentList.length > 0) {
                if (listType === 'ul') elements.push(<ul key={`${keyPrefix}-ul`} className="list-outside ml-5 mb-4 space-y-1">{currentList}</ul>);
                else elements.push(<ol key={`${keyPrefix}-ol`} className="list-outside ml-5 mb-4 space-y-1">{currentList}</ol>);
                currentList = [];
                listType = null;
            }
        };

        lines.forEach((line, i) => {
            // Headers
            if (line.startsWith('### ')) {
                flushList(`${index}-${i}`);
                elements.push(<h3 key={`${index}-${i}`} className="text-lg font-bold mt-6 mb-2 text-zinc-800">{parseInline(line.slice(4))}</h3>);
                return;
            }
            if (line.startsWith('## ')) {
                flushList(`${index}-${i}`);
                elements.push(<h2 key={`${index}-${i}`} className="text-xl font-bold mt-8 mb-4 text-zinc-900 border-b pb-2">{parseInline(line.slice(3))}</h2>);
                return;
            }
            if (line.startsWith('# ')) {
                flushList(`${index}-${i}`);
                elements.push(<h1 key={`${index}-${i}`} className="text-2xl font-bold mt-8 mb-6 text-zinc-900">{parseInline(line.slice(2))}</h1>);
                return;
            }

            // Lists
            const isUl = line.startsWith('- ') || line.startsWith('* ');
            const isOl = /^\d+\. /.test(line);

            if (isUl || isOl) {
                if ((isUl && listType === 'ol') || (isOl && listType === 'ul')) {
                    flushList(`${index}-${i}-switch`);
                }
                listType = isUl ? 'ul' : 'ol';
                const text = isUl ? line.replace(/^[-*] /, '') : line.replace(/^\d+\. /, '');
                
                // Check if list item has bold prefix like "**Title:** description" to style it nicely
                const content = parseInline(text);
                
                currentList.push(
                    <li key={`${index}-${i}`} className={`text-zinc-700 leading-relaxed ${isOl ? 'list-decimal' : 'list-disc'}`}>
                        {content}
                    </li>
                );
            } else {
                flushList(`${index}-${i}`);
                if (line === '---') {
                    elements.push(<hr key={`${index}-${i}`} className="my-8 border-zinc-200" />);
                } else if (line.trim() !== '') {
                    elements.push(<p key={`${index}-${i}`} className="mb-4 text-zinc-700 leading-relaxed">{parseInline(line)}</p>);
                }
            }
        });
        flushList(`${index}-end`);

        return <div key={index}>{elements}</div>;
      })}
    </div>
  );
};

export default MarkdownRenderer;
