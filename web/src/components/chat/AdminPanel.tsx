'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface AdminUser {
  id: string; email: string; name: string; avatar_url: string | null;
  status: string; role: string; approved: boolean; created_at: string;
}

export default function AdminPanel({ onClose, myId }: { onClose: () => void; myId?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'user', password: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await api.patch(`/admin/users/${id}/approve`);
    load();
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`'${u.name}' 계정을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || '삭제 실패');
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await api.put(`/admin/users/${editUser.id}`, {
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        role: form.role,
        password: form.password.trim() || undefined,
      });
      setEditUser(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || '수정 실패');
    }
  };

  const pending = users.filter(u => !u.approved);
  const active = users.filter(u => u.approved);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', borderRadius: '20px', width: '100%', maxWidth: '560px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)' }}>⚙️ 관리자 — 계정 관리</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--t3)', marginTop: '2px' }}>
              승인 대기 {pending.length} · 활성 {active.length}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: 'var(--t3)' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>불러오는 중...</p>
          ) : (
            <>
              {pending.length > 0 && (
                <div style={{ padding: '8px 24px 4px', fontSize: '11.5px', fontWeight: 800, color: 'var(--red)' }}>
                  승인 대기 ({pending.length})
                </div>
              )}
              {pending.map(u => (
                <UserRow key={u.id} u={u} myId={myId} onApprove={approve} onEdit={openEdit} onDelete={remove} />
              ))}

              <div style={{ padding: '12px 24px 4px', fontSize: '11.5px', fontWeight: 800, color: 'var(--t3)' }}>
                활성 계정 ({active.length})
              </div>
              {active.map(u => (
                <UserRow key={u.id} u={u} myId={myId} onApprove={approve} onEdit={openEdit} onDelete={remove} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* 계정 수정 모달 */}
      {editUser && (
        <div onClick={() => setEditUser(null)} style={{
          position: 'fixed', inset: 0, zIndex: 410, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card)', borderRadius: '20px', width: '100%', maxWidth: '340px',
            padding: '24px', boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginBottom: '16px' }}>계정 수정</h3>
            <Field label="이름">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={fieldStyle} />
            </Field>
            <Field label="이메일">
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
            </Field>
            <Field label="권한">
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={fieldStyle}>
                <option value="user">일반 사용자</option>
                <option value="admin">관리자</option>
              </select>
            </Field>
            <Field label="새 비밀번호 (변경 시에만 입력)">
              <input type="password" value={form.password} placeholder="비워두면 유지" onChange={e => setForm({ ...form, password: e.target.value })} style={fieldStyle} />
            </Field>
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--t2)', fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ u, myId, onApprove, onEdit, onDelete }: {
  u: AdminUser; myId?: string;
  onApprove: (id: string) => void; onEdit: (u: AdminUser) => void; onDelete: (u: AdminUser) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 24px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, overflow: 'hidden',
        background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, color: 'var(--blue)',
      }}>
        {u.avatar_url ? <img src={u.avatar_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name?.[0] || '?')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>
          {u.name}
          {u.role === 'admin' && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, color: 'var(--blue)', background: 'var(--blue-bg)', padding: '2px 6px', borderRadius: '6px' }}>관리자</span>}
          {!u.approved && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 6px', borderRadius: '6px' }}>대기</span>}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {!u.approved && (
          <button onClick={() => onApprove(u.id)} style={{ ...actionBtn, background: 'var(--green)', color: '#fff' }}>승인</button>
        )}
        <button onClick={() => onEdit(u)} style={{ ...actionBtn, background: 'var(--bg)', color: 'var(--t2)' }}>수정</button>
        {u.id !== myId && (
          <button onClick={() => onDelete(u)} style={{ ...actionBtn, background: 'var(--red-bg)', color: 'var(--red)' }}>삭제</button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--line)', borderRadius: '10px',
  padding: '10px 12px', fontSize: '14px', outline: 'none', color: 'var(--t1)', background: 'var(--card)',
};

const actionBtn: React.CSSProperties = {
  border: 'none', borderRadius: '8px', padding: '7px 10px', fontSize: '12px',
  fontWeight: 700, cursor: 'pointer',
};
