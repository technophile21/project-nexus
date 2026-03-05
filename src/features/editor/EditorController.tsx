import { EditorView } from './EditorView';

interface EditorControllerProps {
  value: string;
  onChange: (text: string) => void;
  fileName: string | null;
  isDirty: boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

/**
 * Thin controller that bridges App-level file I/O state into EditorView.
 * Any editor-specific logic (e.g. undo stack, local key bindings) lives here
 * without touching EditorView or App.
 *
 * To swap the data source, change the adapter in App.tsx — nothing here changes.
 */
export function EditorController(props: EditorControllerProps) {
  return <EditorView {...props} />;
}
