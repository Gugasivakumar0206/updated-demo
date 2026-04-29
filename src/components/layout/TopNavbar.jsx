import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_MENU } from '../../data/navConfig'
import { Search, Bell, ChevronDown, ChevronRight, Menu, X, Factory, User, LogOut, Settings } from 'lucide-react'
import { clearAuth, getStoredUser } from '../../lib/api'

/* ── Color tokens ────────────────────────────────────────────────────────── */
const C = {
  navbarBg:   '#3B252C',
  navRowBg:   '#4a2f38',
  menuText:   '#e8d5ea',
  active:     '#3B252C',
  hover:      '#f5eef6',
  hoverText:  '#8F6593',
  dropHeader: '#8F6593',
  dropBorder: '#e8d8ea',
  dot:        '#c9a8cc',
}

function anyActive(item, pathname) {
  if (item.path && (pathname === item.path || pathname.startsWith(item.path + '/'))) return true
  if (item.children) return item.children.some(c => anyActive(c, pathname))
  return false
}

/* ─── Dropdown MenuItem ──────────────────────────────────────────────────── */
function MenuItem({ item, onCloseAll, depth = 0 }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const ref = useRef(null)
  const isActive = anyActive(item, location.pathname)
  const hasSub = item.children && item.children.length > 0

  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '8px', padding: '9px 12px', borderRadius: '8px', marginBottom: '1px',
    fontSize: '13px', fontWeight: '500', color: '#3d2b40',
    background: 'transparent', textDecoration: 'none', cursor: 'pointer',
    border: 'none', width: '100%', textAlign: 'left',
    whiteSpace: 'nowrap', minWidth: '170px', fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.12s',
  }

  if (!hasSub) {
    const leafActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    return (
      <Link to={item.path} onClick={onCloseAll} style={{
        ...base,
        color: leafActive ? '#fff' : '#3d2b40',
        background: leafActive ? C.active : 'transparent',
        fontWeight: leafActive ? '700' : '500',
      }}
        onMouseEnter={e => { if (!leafActive) { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.hoverText } }}
        onMouseLeave={e => { if (!leafActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3d2b40' } }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: leafActive ? '#fff' : C.dot }} />
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={{
        ...base,
        color: isActive || open ? C.hoverText : '#3d2b40',
        background: isActive || open ? C.hover : 'transparent',
        fontWeight: isActive ? '700' : '500',
      }}
        onClick={() => setOpen(v => !v)}
        onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.hoverText }}
        onMouseLeave={e => { if (!isActive && !open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3d2b40' } }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.icon && <item.icon size={13} style={{ color: isActive ? C.hoverText : '#b08ab3' }} />}
          {item.label}
        </span>
        <ChevronRight size={12} style={{ color: '#b08ab3', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 0, left: '100%', marginLeft: '4px',
          minWidth: '190px', background: '#fff', borderRadius: '10px',
          boxShadow: '0 12px 40px rgba(59,37,44,0.18)',
          border: `1px solid ${C.dropBorder}`,
          zIndex: 9999, overflow: 'visible', animation: 'dropIn 0.12s ease-out',
        }}>
          <div style={{ padding: '7px 12px 6px', background: C.dropHeader, borderRadius: '10px 10px 0 0' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
          </div>
          <div style={{ padding: '6px' }}>
            {item.path && (
              <Link to={item.path} onClick={onCloseAll} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                borderRadius: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: '700',
                color: C.hoverText, background: C.hover, textDecoration: 'none',
                borderBottom: `1px solid ${C.dropBorder}`, paddingBottom: '10px',
              }}>View All {item.label}</Link>
            )}
            {item.children.map(child => (
              <MenuItem key={child.label} item={child} onCloseAll={onCloseAll} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Top-level NavDropdown ──────────────────────────────────────────────── */
function NavDropdown({ item, isOpen, onToggle, onClose }) {
  const location = useLocation()
  const ref = useRef(null)
  const isActive = anyActive(item, location.pathname)

  useEffect(() => {
    if (!isOpen) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [isOpen, onClose])

  return (
    <div ref={ref} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 12px', height: '100%',
        fontSize: '12px', fontWeight: '700',
        background: isActive || isOpen ? 'rgba(255,255,255,0.2)' : 'transparent',
        border: 'none', cursor: 'pointer', borderRadius: '6px', margin: '5px 1px',
        color: isActive || isOpen ? '#fff' : C.menuText,
        transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { if (!isActive && !isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.menuText } }}
      >
        <span>{item.label}</span>
        <ChevronDown size={11} style={{ color: isActive || isOpen ? '#fff' : '#c9a8cc', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 9999, marginTop: '6px',
          minWidth: '210px', background: '#fff', borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(59,37,44,0.18)',
          border: `1px solid ${C.dropBorder}`,
          overflow: 'visible', animation: 'dropIn 0.15s ease-out',
        }}>
          <div style={{ padding: '10px 14px 8px', background: C.dropHeader, borderRadius: '12px 12px 0 0' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
          </div>
          <div style={{ padding: '6px' }}>
            {item.children.map(child => (
              <MenuItem key={child.label} item={child} onCloseAll={onClose} depth={1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Notification panel ─────────────────────────────────────────────────── */
function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const notes = [
    { id: 1, title: 'Low stock alert',   desc: 'Steel Shaft below minimum', time: '5m ago',  color: '#f59e0b', unread: true },
    { id: 2, title: 'DC Approved',       desc: 'DC-0012 approved',          time: '18m ago', color: '#10b981', unread: true },
    { id: 3, title: 'Rejection Report',  desc: 'REJ-0008 by QC Team',       time: '1h ago',  color: '#ef4444', unread: false },
    { id: 4, title: 'Invoice Generated', desc: 'INV-0045 — Maruti Suzuki',  time: '2h ago',  color: '#8F6593', unread: false },
  ]
  const unread = notes.filter(n => n.unread).length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        position: 'relative', width: '36px', height: '36px', borderRadius: '8px',
        border: 'none', background: open ? 'rgba(255,255,255,0.15)' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#e8d5ea', transition: 'background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px',
            borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '9px',
            fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${C.navbarBg}`,
          }}>{unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '300px',
          background: '#fff', borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(59,37,44,0.18)', border: `1px solid ${C.dropBorder}`,
          zIndex: 9999, overflow: 'hidden', animation: 'dropIn 0.15s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.dropHeader }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Notifications</span>
            <span style={{ fontSize: '11px', color: '#f3c6f5', cursor: 'pointer', fontWeight: '600' }}>Mark all read</span>
          </div>
          {notes.map(n => (
            <div key={n.id} style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #faf4fb', background: n.unread ? '#fdf8fe' : '#fff', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.hover}
              onMouseLeave={e => e.currentTarget.style.background = n.unread ? '#fdf8fe' : '#fff'}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.color, marginTop: '5px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: n.unread ? '700' : '500', color: '#1e1a2e', margin: 0 }}>{n.title}</p>
                <p style={{ fontSize: '12px', color: '#8F6593', margin: '2px 0 3px' }}>{n.desc}</p>
                <p style={{ fontSize: '11px', color: '#b08ab3', margin: 0 }}>{n.time}</p>
              </div>
              {n.unread && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8F6593', marginTop: '6px', flexShrink: 0 }} />}
            </div>
          ))}
          <div style={{ padding: '10px', textAlign: 'center', background: '#fdf8fe' }}>
            <span style={{ fontSize: '12px', color: C.hoverText, cursor: 'pointer', fontWeight: '700' }}>View all notifications</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── User menu ──────────────────────────────────────────────────────────── */
function UserMenu() {
  const [open, setOpen] = useState(false)
  const storedUser = getStoredUser()
  const userName = storedUser?.full_name || 'Admin User'
  const userEmail = storedUser?.email || 'admin@company.com'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AD'

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/'
  }

  const ref = useRef(null)
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '5px 10px 5px 5px', borderRadius: '10px', border: 'none',
        background: open ? 'rgba(255,255,255,0.15)' : 'transparent', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg,#C084CA,#8F6593)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: '800', boxShadow: '0 2px 8px rgba(143,101,147,0.4)' }}>{userInitials}</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', lineHeight: 1.3 }}>{userName}</div>
          <div style={{ fontSize: '10px', color: '#c9a8cc', lineHeight: 1.3 }}>Authenticated User</div>
        </div>
        <ChevronDown size={12} style={{ color: '#c9a8cc', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '220px', background: '#fff', borderRadius: '14px', boxShadow: '0 12px 40px rgba(59,37,44,0.18)', border: `1px solid ${C.dropBorder}`, zIndex: 9999, overflow: 'hidden', animation: 'dropIn 0.15s ease-out' }}>
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#8F6593,#5C3D61)', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: '800' }}>{userInitials}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{userName}</div>
              <div style={{ fontSize: '11px', color: '#e8d5ea', marginTop: '2px' }}>{userEmail}</div>
            </div>
          </div>
          <div style={{ padding: '6px' }}>
            {[{ Icon: User, label: 'My Profile' }, { Icon: Settings, label: 'Settings' }].map(({ Icon, label }) => (
              <button key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', width: '100%', border: 'none', background: 'transparent', borderRadius: '8px', fontSize: '13px', color: '#3d2b40', cursor: 'pointer', fontWeight: '600', fontFamily: "'DM Sans',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.hoverText }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3d2b40' }}
              ><Icon size={14} style={{ color: '#b08ab3' }} />{label}</button>
            ))}
            <div style={{ borderTop: '1px solid #f0e8f1', margin: '4px 0' }}>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', width: '100%', border: 'none', background: 'transparent', borderRadius: '8px', fontSize: '13px', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontFamily: "'DM Sans',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              ><LogOut size={14} />Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Mobile item ────────────────────────────────────────────────────────── */
function MobileItem({ item, depth = 0, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()
  const isActive = anyActive(item, location.pathname)
  const hasSub = item.children && item.children.length > 0
  const indent = 14 + depth * 14

  if (!hasSub) {
    return (
      <Link to={item.path} onClick={onClose} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: `9px ${indent}px`, borderRadius: '10px', marginBottom: '2px',
        fontSize: '13px', fontWeight: '600', textDecoration: 'none',
        color: isActive ? '#fff' : '#e8d5ea',
        background: isActive ? C.active : 'transparent',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: isActive ? '#fff' : C.dot }} />
        {item.label}
      </Link>
    )
  }

  return (
    <div style={{ marginBottom: '2px' }}>
      <button onClick={() => setExpanded(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `9px ${indent}px`, borderRadius: '10px', border: 'none',
        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
        color: isActive ? '#C084CA' : '#e8d5ea', background: 'transparent',
        fontFamily: "'DM Sans',sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {item.icon && <item.icon size={14} />}{item.label}
        </div>
        <ChevronDown size={13} style={{ color: '#c9a8cc', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', marginRight: '4px' }} />
      </button>
      {expanded && (
        <div style={{ marginLeft: `${indent + 6}px`, paddingLeft: '12px', borderLeft: '2px solid rgba(192,132,202,0.3)', marginTop: '2px', marginBottom: '4px' }}>
          {item.children.map(child => (
            <MobileItem key={child.label} item={child} depth={depth + 1} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── MAIN TopNavbar ─────────────────────────────────────────────────────── */
export default function TopNavbar() {
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const toggle = (label) => setOpenMenu(v => v === label ? null : label)
  const closeAll = () => setOpenMenu(null)
  useEffect(() => { closeAll(); setMobileOpen(false) }, [location.pathname])

  return (
    <>
      <style>{`
        .erp-header { position:sticky; top:0; z-index:100; background:${C.navbarBg}; box-shadow:0 4px 20px rgba(59,37,44,0.4); }
        .erp-topbar { border-bottom:1px solid rgba(255,255,255,0.07); }
        .erp-topbar-inner { max-width:1600px; margin:0 auto; padding:0 24px; display:flex; align-items:center; height:58px; gap:16px; }
        .erp-logo { display:flex; align-items:center; gap:11px; text-decoration:none; flex-shrink:0; }
        .erp-logo-icon { width:38px; height:38px; background:linear-gradient(135deg,#C084CA,#8F6593); border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(143,101,147,0.5); flex-shrink:0; }
        .erp-logo-name { font-size:15px; font-weight:800; color:#fff; font-family:'Sora',sans-serif; letter-spacing:-0.2px; display:block; }
        .erp-logo-sub  { font-size:9px; color:#c9a8cc; letter-spacing:0.14em; text-transform:uppercase; font-weight:600; display:block; margin-top:1px; }
        .erp-divider { width:1px; height:24px; background:rgba(255,255,255,0.1); flex-shrink:0; }
        .erp-search-wrap { flex:1; max-width:340px; position:relative; }
        .erp-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); pointer-events:none; }
        .erp-search { width:100%; padding:8px 14px 8px 36px; font-size:13px; font-weight:500; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); border-radius:8px; outline:none; color:#ffffff; font-family:'DM Sans',sans-serif; transition:border-color 0.15s, background 0.15s; }
        .erp-search:focus { background:rgba(255,255,255,0.13); border-color:#C084CA; box-shadow:0 0 0 3px rgba(192,132,202,0.2); }
        .erp-search::placeholder { color:rgba(255,255,255,0.35); font-weight:400; }
        .erp-spacer { flex:1; }
        .erp-right { display:flex; align-items:center; gap:6px; }
        .erp-navrow { background:${C.navRowBg}; border-bottom:1px solid rgba(255,255,255,0.06); }
        .erp-navrow-inner { max-width:1600px; margin:0 auto; padding:0 16px; display:flex; align-items:stretch; height:40px; gap:0; overflow:visible; }
        .erp-hamburger { display:none; width:36px; height:36px; border-radius:8px; border:none; background:transparent; cursor:pointer; align-items:center; justify-content:center; color:#e8d5ea; }
        .erp-mobile-menu { background:${C.navbarBg}; border-top:1px solid rgba(255,255,255,0.07); max-height:80vh; overflow-y:auto; }
        .erp-mobile-inner { max-width:1600px; margin:0 auto; padding:14px 16px; }
        @media(max-width:1023px){ .erp-navrow{display:none!important;} .erp-hamburger{display:flex!important;} .erp-search-wrap{display:none;} }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px) scale(0.98);} to{opacity:1;transform:translateY(0) scale(1);} }
      `}</style>

      <header className="erp-header">
        <div className="erp-topbar">
          <div className="erp-topbar-inner">
            <Link to="/dashboard" className="erp-logo">
              <div className="erp-logo-icon"><Factory size={18} color="#fff" /></div>
              <div>
                <span className="erp-logo-name">ManufactERP</span>
                <span className="erp-logo-sub">Enterprise System</span>
              </div>
            </Link>
            <div className="erp-divider" />
            <div className="erp-search-wrap">
              <Search size={14} className="erp-search-icon" />
              <input className="erp-search" type="text" placeholder="Search items, orders, reports..." />
            </div>
            <div className="erp-spacer" />
            <div className="erp-right">
              <NotificationPanel />
              <div className="erp-divider" style={{ margin: '0 4px' }} />
              <UserMenu />
              <button className="erp-hamburger" onClick={() => setMobileOpen(v => !v)}>
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="erp-navrow">
          <nav className="erp-navrow-inner">
            {NAV_MENU.map(item => {
              if (item.children) {
                return <NavDropdown key={item.label} item={item} isOpen={openMenu === item.label} onToggle={() => toggle(item.label)} onClose={closeAll} />
              }
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <Link key={item.label} to={item.path} onClick={closeAll} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '0 12px', height: '100%', fontSize: '12px', fontWeight: '700',
                  textDecoration: 'none', color: isActive ? '#fff' : C.menuText,
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderRadius: '6px', margin: '5px 1px', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.15s', fontFamily: "'DM Sans',sans-serif",
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.menuText } }}
                >
                  {item.icon && <item.icon size={13} />}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {mobileOpen && (
          <div className="erp-mobile-menu">
            <div className="erp-mobile-inner">
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#c9a8cc' }} />
                <input type="text" placeholder="Search..." style={{ width: '100%', padding: '9px 14px 9px 34px', fontSize: '13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', outline: 'none', color: '#fff', fontFamily: "'DM Sans',sans-serif" }} />
              </div>
              {NAV_MENU.map(item => <MobileItem key={item.label} item={item} onClose={() => setMobileOpen(false)} />)}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
