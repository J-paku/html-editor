'use client'

// 編集器の画面(I/Oコンテナ。一覧はscripts/container-dirs.mjs)。表示部品を、セッション(開いたプロジェクト、
// ./utils/reduce-session.ts)と、隣のフックを通した外の世界につなぐ。開く・閉じる、保存と衝突の選択、IndexedDBの下書きと
// その復元、離れるときの警告、プレビュー、全画面の表示、問いの窓の焦点。それぞれの変化の決まりは./utilsの純粋関数にある
import { useId, useReducer } from 'react'
import type { Strings } from '@content/types/strings'
import CodeEditor from './components/CodeEditor/container'
import ConflictDialog from './components/ConflictDialog'
import EditorLayout from './components/EditorLayout'
import FileList from './components/FileList'
import Notice from './components/Notice'
import PreviewFrame from './components/PreviewFrame'
import RestoreDialog from './components/RestoreDialog'
import StartScreen from './components/StartScreen'
import Toolbar from './components/Toolbar'
import { useDialogFocus } from './hooks/use-dialog-focus'
import { useDraftAutosave } from './hooks/use-draft-autosave'
import { useFileAccessSupport } from './hooks/use-file-access'
import { useLeaveWarning } from './hooks/use-leave-warning'
import { useNotice } from './hooks/use-notice'
import { useOpenProject } from './hooks/use-open-project'
import { usePresent } from './hooks/use-present'
import { usePreviewSrcdoc } from './hooks/use-preview-srcdoc'
import { useRestoreOffer } from './hooks/use-restore-offer'
import { useSaveFile } from './hooks/use-save-file'
import { canRedo, canUndo, isDirty } from './utils/doc-state'
import { ignoreChange } from './utils/ignore-change'
import { activeFileOf, fileListItemsOf, isSessionDirty } from './utils/read-session'
import { reduceSession } from './utils/reduce-session'
import styles from './editor-page.module.css'

type EditorPageContainerProps = {
  strings: Strings
}

function EditorPageContainer({ strings }: EditorPageContainerProps) {
  const isSupported = useFileAccessSupport()
  const [session, dispatch] = useReducer(reduceSession, null)
  const { notice, report, dismiss } = useNotice()
  const restoreOffer = useRestoreOffer(session, dispatch, report)
  const opener = useOpenProject(dispatch, report, restoreOffer.check)
  const saver = useSaveFile(session, dispatch, report)
  useDraftAutosave(session, report, restoreOffer.held)
  const { offer } = restoreOffer
  const { conflictPath } = saver
  const isAsking = conflictPath !== null || offer !== null
  const dialogLayer = useDialogFocus(isAsking)
  const hasUnsavedChanges = isSessionDirty(session)
  useLeaveWarning(hasUnsavedChanges)
  const srcdoc = usePreviewSrcdoc(session)
  const { target: previewBox, present } = usePresent(report)
  const conflictTitleId = useId()
  const restoreTitleId = useId()

  const noticeView = notice !== null && (
    <Notice strings={strings.notice} kind={notice} onDismiss={dismiss} />
  )

  if (session === null) {
    return (
      <main className={styles.page}>
        <StartScreen
          strings={strings.startScreen}
          isSupported={isSupported}
          onOpenFolder={opener.openFolder}
          onOpenFile={opener.openFile}
        />
        {noticeView}
      </main>
    )
  }

  const active = activeFileOf(session)

  return (
    <main className={styles.page}>
      {/* 問いの窓が尋ねている間は、後ろの画面は焦点・クリック・キーを受けない(窓はモーダル) */}
      <div inert={isAsking}>
        <EditorLayout
          strings={strings.editorLayout}
          toolbar={
            <Toolbar
              strings={strings.toolbar}
              projectName={session.name}
              hasUnsavedChanges={hasUnsavedChanges}
              openDisabled
              saveDisabled={saver.saving || !isDirty(active.doc, active.savedDoc)}
              undoDisabled={!canUndo(active.doc)}
              redoDisabled={!canRedo(active.doc)}
              presentDisabled={srcdoc === undefined}
              modeDisabled
              mode='edit'
              onOpen={ignoreChange}
              onSave={() => saver.save(session)}
              onUndo={() => dispatch({ type: 'undone' })}
              onRedo={() => dispatch({ type: 'redone' })}
              onPresent={present}
              onModeChange={ignoreChange}
            />
          }
          fileList={
            <FileList
              strings={strings.fileList}
              files={fileListItemsOf(session)}
              activePath={active.path}
              onSelect={path => dispatch({ type: 'selected', path })}
            />
          }
          codeEditor={
            <CodeEditor
              state={active.doc}
              onChange={doc => dispatch({ type: 'edited', path: active.path, doc })}
              label={strings.editor.codeLabel}
            />
          }
          preview={
            <div ref={previewBox} className={styles.preview}>
              {srcdoc === undefined ? (
                <p className={styles.noPreview}>{strings.editor.noPreview}</p>
              ) : (
                <PreviewFrame srcdoc={srcdoc} title={strings.editor.previewTitle} />
              )}
            </div>
          }
        />
      </div>
      <div ref={dialogLayer}>
        {conflictPath !== null && (
          <ConflictDialog
            strings={strings.conflictDialog}
            open
            titleId={conflictTitleId}
            filePath={conflictPath}
            onOverwrite={() => saver.overwrite(session, conflictPath)}
            onLoadDisk={() => saver.loadDisk(session, conflictPath)}
            onCancel={saver.cancel}
          />
        )}
        {offer !== null && (
          <RestoreDialog
            strings={strings.restoreDialog}
            open
            titleId={restoreTitleId}
            filePaths={offer.drafts.map(draft => draft.path)}
            hasDiskChanges={offer.hasDiskChanges}
            onRestore={() => restoreOffer.restore(offer)}
            onDiscard={() => restoreOffer.discard(session, offer)}
          />
        )}
      </div>
      {noticeView}
    </main>
  )
}

export default EditorPageContainer
