'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export const SoulViewer: React.FC = () => {
  const [markdown, setMarkdown] = useState('');
  const [sections, setSections] = useState<Array<{ title: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSoul();
  }, []);

  const fetchSoul = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gateway/soul');
      const data = await res.json();
      if (data.rawMarkdown) {
        setMarkdown(data.rawMarkdown);
        setSections(data.sections || []);
      }
    } catch {
      setStatusMessage('Failed to fetch SOUL specification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/gateway/soul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('SOUL configuration updated successfully');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage(data.error || 'Update failed');
      }
    } catch (err: any) {
      setStatusMessage(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-zinc-500">
        Loading SOUL.md specification...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">SOUL.md Specification</h3>
          <span className="text-xs font-mono text-zinc-500">({sections.length} sections)</span>
        </div>
        <div className="flex items-center space-x-3">
          {statusMessage && (
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={18}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 leading-relaxed resize-none"
            spellCheck={false}
          />
        </div>

        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">Parsed Directives</div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {sections.map((sec, idx) => (
              <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-md">
                <div className="text-xs font-medium text-zinc-200 mb-1">{sec.title}</div>
                <div className="text-[11px] font-mono text-zinc-400 line-clamp-3 leading-relaxed">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
