import { createContext, useContext } from 'react'
export type EditorKind = 'task' | 'followup' | 'project' | 'idea' | 'prospect' | 'lead' | 'referrer' | 'replied' | 'new'
export type OpenEditor = (kind: EditorKind, item?: any, defaults?: Record<string, any>) => void
export const EditorCtx = createContext<OpenEditor>(() => {})
export const useEditor = () => useContext(EditorCtx)
