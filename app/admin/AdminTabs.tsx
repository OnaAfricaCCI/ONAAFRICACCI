'use client'

import { useState } from 'react'

/**
 * Two-tab shell for the admin page. Both panels are server-rendered and passed
 * in as props; this just toggles which is visible (via `hidden`, so neither
 * re-fetches on switch). Tab 1 "Admin" is the operational dashboard; tab 2
 * "Database" is the providers + grants reconciliation view.
 */
export default function AdminTabs({ adminTab, databaseTab }: { adminTab: React.ReactNode; databaseTab: React.ReactNode }) {
  const [tab, setTab] = useState<'admin' | 'database'>('admin')
  const Btn = ({ k, label }: { k: 'admin' | 'database'; label: string }) => (
    <button
      type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}
      className="px-4 py-2.5 text-[15px] font-bold"
      style={{ borderBottom: tab === k ? '3px solid var(--accent)' : '3px solid transparent', color: tab === k ? 'var(--ink)' : 'var(--graphite)' }}
    >
      {label}
    </button>
  )
  return (
    <div className="mt-6">
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
        <Btn k="admin" label="Admin" />
        <Btn k="database" label="Database" />
      </div>
      <div hidden={tab !== 'admin'}>{adminTab}</div>
      <div hidden={tab !== 'database'}>{databaseTab}</div>
    </div>
  )
}
