import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { useData } from '../lib/data'

export function More() {
  const { signOut } = useData()

  return (
    <>
      <header className="large">
        <p className="date">Command Centre</p>
        <h1>More</h1>
      </header>

      <section className="section">
        <div className="group">
          <button className="row" onClick={() => go('/settings')}>
            <span className="tile sm"><Icon name="gear" size={18} /></span>
            <div className="row-main"><div className="row-title">Settings</div></div>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </section>

      <section className="section">
        <div className="group">
          <button className="row danger-row" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </>
  )
}
