import { Sparkles, X } from 'lucide-react'
import { RenduMarkdownLeger } from '../lib/markdownLeger'
import type { NotesRedemarrage } from '@shared/types'
import { useI18n } from '../i18n'

export default function UpdateNotesDialog({ notes, fermer }: { notes: NotesRedemarrage; fermer: () => void }) {
  const { t } = useI18n()
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={fermer}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notes-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-blue-950/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-blue-400" />
            <h2 id="update-notes-title" className="text-sm font-semibold text-white">
              {t('update.notesTitle', { version: notes.version })}
            </h2>
          </div>
          <button
            onClick={fermer}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label={t('common.close')}
          >
            <X size={17} />
          </button>
        </header>
        <div className="max-h-80 overflow-y-auto px-5 py-4">
          {notes.notes ? (
            <RenduMarkdownLeger texte={notes.notes} />
          ) : (
            <p className="text-sm text-slate-400">{t('update.notesEmpty')}</p>
          )}
        </div>
        <footer className="flex justify-end border-t border-slate-800 bg-slate-900/40 px-5 py-3">
          <button
            onClick={fermer}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            {t('common.close')}
          </button>
        </footer>
      </section>
    </div>
  )
}
