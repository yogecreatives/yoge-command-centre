import { useState } from 'react'
import { useData } from '../lib/data'
import { Group, IdeaRow } from '../components/Rows'
import { Segmented } from '../ui/Sheet'
import { useToast } from '../ui/toast'

export function Ideas() {
  const { ideas, create } = useData()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState<'open' | 'closed'>('open')
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (await create('ideas', { title: title.trim() })) { setTitle(''); toast('Idea saved') }
  }
  const sorted = [...ideas].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return (
    <>
      <header className="large"><h1>Ideas</h1></header>
      <form className="capture" onSubmit={save}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Capture an idea" enterKeyHint="done" />
        <button className="btn primary" disabled={!title.trim()}>Save</button>
      </form>
      <Segmented value={tab} onChange={setTab} options={[['open', 'Inbox'], ['closed', 'Converted & archived']]} />
      <Group items={sorted.filter(i => (tab === 'open' ? i.status === 'new' || i.status === 'exploring' : i.status === 'converted' || i.status === 'archived')).map(i => <IdeaRow key={i.id} i={i} />)}
        empty={tab === 'open' ? 'Your inbox is empty. Type an idea above; sort it out later.' : 'Nothing converted or archived yet.'} />
    </>
  )
}
