'use client';

import React, { useId, useRef, useState, type ReactNode } from 'react';
import styles from './CmsPageWorkspace.module.css';

type WorkspaceMode = 'edit' | 'split' | 'preview';
type MobilePanel = 'edit' | 'preview';

/** Layout state only: the parent continues to own the draft and lifecycle. */
export function CmsPageWorkspace({ children, preview }: {
  children: ReactNode;
  preview: ReactNode;
}) {
  const id = useId();
  const [mode, setMode] = useState<WorkspaceMode>('edit');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('edit');
  const [previewOpened, setPreviewOpened] = useState(false);
  const editTab = useRef<HTMLButtonElement>(null);
  const previewTab = useRef<HTMLButtonElement>(null);

  function selectMode(next: WorkspaceMode) {
    setMode(next);
    setMobilePanel(next === 'edit' ? 'edit' : 'preview');
    if (next !== 'edit') setPreviewOpened(true);
  }

  function selectMobilePanel(next: MobilePanel) {
    setMobilePanel(next);
    // A preview opened on a phone becomes a split workspace on a wider screen.
    if (next === 'preview') {
      setPreviewOpened(true);
      setMode('split');
    }
  }

  return (
    <div className={styles.workspace} data-mode={mode} data-mobile-panel={mobilePanel}>
      {!previewOpened ? (
        <button type="button" className={styles.button} onClick={() => selectMode('split')}>
          Open live preview
        </button>
      ) : null}
      <div className={styles.desktopControls} role="group" aria-label="Workspace layout">
        {(['edit', 'split', 'preview'] as const).map((value) => (
          <button key={value} type="button" className={styles.button}
            aria-pressed={mode === value} onClick={() => selectMode(value)}>
            {value === 'edit' ? 'Edit only' : value === 'split' ? 'Split view' : 'Full preview'}
          </button>
        ))}
      </div>
      <div className={styles.mobileControls} role="tablist" aria-label="Workspace view">
        {(['edit', 'preview'] as const).map((value) => (
          <button key={value} ref={value === 'edit' ? editTab : previewTab}
            id={`${id}-${value}-tab`} type="button" role="tab" className={styles.button}
            aria-selected={mobilePanel === value} aria-controls={`${id}-${value}`}
            tabIndex={mobilePanel === value ? 0 : -1}
            onClick={() => selectMobilePanel(value)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 'edit' : event.key === 'End' ? 'preview' : value === 'edit' ? 'preview' : 'edit';
              selectMobilePanel(next);
              (next === 'edit' ? editTab : previewTab).current?.focus();
            }}>
            {value === 'edit' ? 'Edit' : 'Live preview'}
          </button>
        ))}
      </div>
      <div className={styles.panes}>
        <div id={`${id}-edit`} className={styles.editorPanel} role="tabpanel" aria-label="Page editor">
          <div className={styles.editorGrid}>{children}</div>
        </div>
        <div id={`${id}-preview`} className={styles.previewPanel} role="tabpanel" aria-label="Page preview">
          {/* Once opened, keep the same frame mounted across view switches. */}
          {previewOpened ? preview : null}
        </div>
      </div>
    </div>
  );
}
