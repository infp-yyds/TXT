

import React, { useState, useEffect } from 'react';
import { StickyNote, X, Sparkles, Edit3, ClipboardList, ChevronUp, ChevronDown, GripVertical, Check, Copy, FileText, Wand2 } from 'lucide-react';
import { NoteCard, OutlineSection, OutlineTemplate } from '../types';

interface VibeVisualizerProps {
  noteCards: NoteCard[];
  draftOutline: OutlineSection[];
  selectedTemplateId: string | null;
  outlineIsLoading: boolean;
  onUpdateCard: (id: string, text: string) => void;
  onGenerateOutline: () => void;
  onSelectTemplate: (templateId: string) => void;
  onUpdateOutline: (outline: OutlineSection[]) => void;
  onGenerateDraft: (prompt: string) => void;
}

type ViewMode = 'noteCards' | 'draftOutline';

const initialDraftOutline: OutlineSection[] = [
  { id: 'sec-1', title: '【核心开篇】', content: '吸引读者注意力的开场白，提出问题或引出痛点...' },
  { id: 'sec-2', title: '【核心洞察】', content: '深入剖析问题，提供独特见解, 建立共鸣...' },
  { id: 'sec-3', title: '【解决方案/价值】', content: '阐述解决方案或核心价值主张...' },
  { id: 'sec-4', title: '【行动召唤】', content: '明确引导读者采取下一步行动...' },
  { id: 'sec-5', title: '【补充说明/展望】', content: '总结或未来展望...' },
];

const OUTLINE_TEMPLATES: OutlineTemplate[] = [
  {
    id: 'classic-5-step',
    name: '经典五步法',
    description: '适用于大多数文章的标准结构，引导读者从认知到行动。',
    sections: initialDraftOutline,
  },
  {
    id: 'pas-framework',
    name: 'PAS 框架',
    description: '通过“问题-激化-解决”路径强化说服力，适用于营销文案。',
    sections: [
      { id: 'pas-1', title: '【P - Problem / 问题】', content: '清晰地描述读者的核心痛点。' },
      { id: 'pas-2', title: '【A - Agitate / 激化】', content: '深入挖掘痛点带来的负面影响和情绪，让读者感同身受。' },
      { id: 'pas-3', title: '【S - Solution / 解决】', content: '引出你的解决方案，展示它如何完美地解决上述问题。' },
    ],
  },
  {
    id: 'story-arc',
    name: '英雄之旅',
    description: '通过叙事结构吸引读者，适用于品牌故事、个人成长等内容。',
    sections: [
      { id: 'story-1', title: '【平凡的世界】', content: '介绍主角（或读者）的初始状态和背景。' },
      { id: 'story-2', title: '【挑战的召唤】', content: '一个问题的出现，打破了平静，迫使主角做出改变。' },
      { id: 'story-3', title: '【历经考验】', content: '主角在解决问题的路上遇到的困难和转折点。' },
      { id: 'story-4', title: '【最终的宝藏】', content: '主角通过努力获得了什么洞察、能力或解决方案。' },
      { id: 'story-5', title: '【满载而归】', content: '主角带着新的收获回归，并分享给他人（行动召唤）。' },
    ],
  },
];

const formatOutlineToMarkdown = (outline: OutlineSection[]): string => {
  return outline.map(section => {
    const title = section.title.replace(/【|】/g, '');
    return `## ${title}\n\n${section.content}`;
  }).join('\n\n---\n\n');
};

const VibeVisualizer: React.FC<VibeVisualizerProps> = ({ 
  noteCards, 
  draftOutline,
  selectedTemplateId,
  outlineIsLoading,
  onUpdateCard,
  onGenerateOutline,
  onSelectTemplate,
  onUpdateOutline,
  onGenerateDraft 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('noteCards');
  const [localNoteCards, setLocalNoteCards] = useState<NoteCard[]>([]);
  const [expandedCardField, setExpandedCardField] = useState<{ id: string, field: 'question' | 'answer' } | null>(null);
  const [editingCardText, setEditingCardText] = useState('');
  const [selectedNoteCardId, setSelectedNoteCardId] = useState<string | null>(null);
  const [editingOutlineSectionId, setEditingOutlineSectionId] = useState<string | null>(null);
  const [editingOutlineField, setEditingOutlineField] = useState<'title' | 'content' | null>(null);
  const [editingOutlineText, setEditingOutlineText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalNoteCards(noteCards);
  }, [noteCards]);

  const moveItem = <T extends { id: string }>(list: T[], onUpdate: (list: T[]) => void, id: string, direction: 'up' | 'down') => {
    const index = list.findIndex(item => item.id === id);
    if ((direction === 'up' && index < 1) || (direction === 'down' && index > list.length - 2)) return;
    const newList = [...list];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    onUpdate(newList);
  };
  
  const saveEditingAnswer = (id: string) => {
    if (expandedCardField?.id === id && expandedCardField.field === 'answer') {
        onUpdateCard(id, editingCardText);
        setExpandedCardField(null);
    }
  };

  const saveEditingOutline = (id: string) => {
    const newOutline = draftOutline.map(sec => 
      sec.id === id && editingOutlineField ? { ...sec, [editingOutlineField]: editingOutlineText } : sec
    );
    onUpdateOutline(newOutline);
    setEditingOutlineSectionId(null);
  };

  const mountNoteCardContent = (sectionId: string) => {
    if (!selectedNoteCardId) return;
    const selectedCard = localNoteCards.find(card => card.id === selectedNoteCardId);
    if (selectedCard) {
      const newOutline = draftOutline.map(sec => 
        sec.id === sectionId ? { ...sec, content: sec.content.startsWith('...') ? selectedCard.answer : sec.content + '\n\n' + selectedCard.answer } : sec
      );
      onUpdateOutline(newOutline);
      setSelectedNoteCardId(null);
    }
  };

  const handleCopyOutline = () => {
    const markdown = formatOutlineToMarkdown(draftOutline);
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleGenerateDraft = () => {
    const outlineMarkdown = formatOutlineToMarkdown(draftOutline);
    const prompt = `老大，这是咱们一起理好的“弦”，请你根据这个大纲，帮我织成一篇结构清晰、内容流畅的文章初稿。请保留 Markdown 格式，以便我后续修改。这是大纲：\n\n${outlineMarkdown}`;
    onGenerateDraft(prompt);
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:scale-105 active:scale-95 group">
        <StickyNote size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-sm md:max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <span className="text-zinc-100 font-bold tracking-wide">线团架</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white p-2"><X size={20} /></button>
              </div>
              <div role="tablist" className="flex justify-around px-6">
                 {['noteCards', 'draftOutline'].map(view => (
                  <button key={view} role="tab" aria-selected={currentView === view} onClick={() => { setCurrentView(view as ViewMode); setSelectedNoteCardId(null); }}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 ${currentView === view ? 'text-indigo-400 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                    {view === 'noteCards' ? `想法卡片 (${localNoteCards.length})` : '理线团'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {currentView === 'noteCards' && (localNoteCards.length === 0 ? (
                <div className="text-center py-12 text-zinc-600"><StickyNote size={48} className="mx-auto mb-4 opacity-20" /><p>暂无想法卡片</p></div>
              ) : (
                localNoteCards.map((card, index) => (
                  <div key={card.id} onClick={() => !expandedCardField && setSelectedNoteCardId(prev => prev === card.id ? null : card.id)}
                    className={`group bg-zinc-800/50 border rounded-xl p-4 flex gap-3 transition-all cursor-pointer ${selectedNoteCardId === card.id ? 'border-indigo-400 ring-2 ring-indigo-500/40' : 'border-zinc-700/50'}`}>
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <button onClick={() => moveItem(localNoteCards, setLocalNoteCards, card.id, 'up')} disabled={index === 0} className="p-1 text-zinc-600 disabled:opacity-30 hover:text-white"><ChevronUp size={14} /></button>
                      <GripVertical size={14} className="text-zinc-700" />
                      <button onClick={() => moveItem(localNoteCards, setLocalNoteCards, card.id, 'down')} disabled={index === localNoteCards.length - 1} className="p-1 text-zinc-600 disabled:opacity-30 hover:text-white"><ChevronDown size={14} /></button>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-zinc-500 mb-1.5">
                        <span className="font-bold">问: </span>
                        <span className="text-zinc-400">{card.questionSummary}</span>
                      </div>
                      {expandedCardField?.id === card.id && expandedCardField.field === 'answer' ? (
                        <textarea value={editingCardText} onChange={(e) => setEditingCardText(e.target.value)} onBlur={() => saveEditingAnswer(card.id)} autoFocus className="w-full bg-zinc-700 text-zinc-100 rounded-md p-2 text-sm border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" rows={4} />
                      ) : ( 
                        <div className="text-sm text-zinc-300 leading-relaxed">
                          <span className="font-semibold text-zinc-500">答: </span>
                          <span className="text-zinc-300">{card.answerSummary}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {expandedCardField?.id === card.id ? (
                        <button onClick={() => saveEditingAnswer(card.id)} className="p-2 text-indigo-400 hover:text-white"><Check size={16} /></button>
                      ) : (
                        <button onClick={() => { setExpandedCardField({ id: card.id, field: 'answer' }); setEditingCardText(card.answer); }} className="p-2 text-zinc-500 group-hover:text-white transition-colors"><Edit3 size={16} /></button>
                      )}
                    </div>
                  </div>
                ))
              ))}

              {currentView === 'draftOutline' && (!selectedTemplateId ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-zinc-400 py-2">请先选择一个内容框架：</p>
                  {OUTLINE_TEMPLATES.map(template => (
                    <button key={template.id} onClick={() => onSelectTemplate(template.id)} className="w-full text-left bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 transition-all hover:border-indigo-400/50 hover:bg-zinc-800">
                      <h4 className="font-bold text-indigo-400 text-sm">{template.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                draftOutline.map((section, index) => (
                  <div key={section.id} className="group bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex gap-3">
                     <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <button onClick={() => moveItem(draftOutline, onUpdateOutline, section.id, 'up')} disabled={index === 0} className="p-1 text-zinc-600 disabled:opacity-30 hover:text-white"><ChevronUp size={14} /></button>
                      <GripVertical size={14} className="text-zinc-700" />
                      <button onClick={() => moveItem(draftOutline, onUpdateOutline, section.id, 'down')} disabled={index === draftOutline.length - 1} className="p-1 text-zinc-600 disabled:opacity-30 hover:text-white"><ChevronDown size={14} /></button>
                    </div>
                    <div className="flex-1 space-y-2">
                      {editingOutlineSectionId === section.id && editingOutlineField === 'title' ? (
                        <input value={editingOutlineText} onChange={e => setEditingOutlineText(e.target.value)} onBlur={() => saveEditingOutline(section.id)} onKeyDown={e => e.key === 'Enter' && saveEditingOutline(section.id)} autoFocus className="w-full bg-zinc-700 text-indigo-400 font-bold rounded-md px-2 py-1 text-sm border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" />
                      ) : ( <h3 onDoubleClick={() => { setEditingOutlineSectionId(section.id); setEditingOutlineField('title'); setEditingOutlineText(section.title); }} className="text-indigo-400 font-bold text-sm cursor-pointer">{section.title}</h3> )}
                      {editingOutlineSectionId === section.id && editingOutlineField === 'content' ? (
                        <textarea value={editingOutlineText} onChange={e => setEditingOutlineText(e.target.value)} onBlur={() => saveEditingOutline(section.id)} autoFocus className="w-full bg-zinc-700 text-zinc-300 rounded-md p-2 text-sm border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" rows={5} />
                      ) : ( <p onDoubleClick={() => { setEditingOutlineSectionId(section.id); setEditingOutlineField('content'); setEditingOutlineText(section.content); }} className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap cursor-pointer">{section.content}</p> )}
                    </div>
                    {selectedNoteCardId && (
                      <div className="flex-shrink-0 self-center"> <button onClick={() => mountNoteCardContent(section.id)} className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-indigo-500 active:scale-95 transition-all"> 置入 </button> </div>
                    )}
                  </div>
                ))
              ))}
            </div>
            
            {(currentView === 'draftOutline' && selectedTemplateId) &&
              <div className="p-4 bg-zinc-950/80 backdrop-blur-sm border-t border-zinc-800 flex items-center gap-2 justify-between">
                <button onClick={onGenerateOutline} disabled={noteCards.length < 5 || outlineIsLoading} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-400 disabled:cursor-not-allowed transition-colors">
                  {outlineIsLoading ? <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <Wand2 size={14} />}
                  {outlineIsLoading ? '填充中...' : '智能填充'}
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyOutline} className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-700">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? '已复制!' : '复制'}
                    </button>
                    <button onClick={handleGenerateDraft} className="flex items-center gap-2 bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-600">
                    <FileText size={14} /> 生成初稿
                    </button>
                </div>
              </div>
            }
          </div>
        </div>
      )}
    </>
  );
};

export default VibeVisualizer;
