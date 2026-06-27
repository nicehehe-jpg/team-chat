'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (isRegister) {
        const result = await register(form.email, form.password, form.name);
        if (result.pending) {
          setNotice(result.message || '가입 신청 완료. 관리자 승인 후 이용할 수 있습니다.');
          setIsRegister(false);
          setForm({ email: form.email, password: '', name: '' });
          return;
        }
      } else {
        await login(form.email, form.password);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: '24px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'var(--blue)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', marginBottom: '16px',
          }}>💬</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--t1)', marginBottom: '6px' }}>
            Team Chat
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--t3)', fontWeight: 500 }}>
            {isRegister ? '새 계정을 만들어 시작하세요' : '팀과 함께 소통하세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isRegister && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: '6px' }}>
                이름
              </label>
              <input
                type="text"
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={{
                  width: '100%', border: '1.5px solid var(--line)', borderRadius: '12px',
                  padding: '12px 14px', fontSize: '14px', outline: 'none',
                  color: 'var(--t1)', background: 'var(--card)',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e => e.target.style.borderColor = 'var(--line)'}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: '6px' }}>
              이메일
            </label>
            <input
              type="email"
              placeholder="example@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              style={{
                width: '100%', border: '1.5px solid var(--line)', borderRadius: '12px',
                padding: '12px 14px', fontSize: '14px', outline: 'none',
                color: 'var(--t1)', background: 'var(--card)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--line)'}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: '6px' }}>
              비밀번호
            </label>
            <input
              type="password"
              placeholder="8자 이상 입력"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              style={{
                width: '100%', border: '1.5px solid var(--line)', borderRadius: '12px',
                padding: '12px 14px', fontSize: '14px', outline: 'none',
                color: 'var(--t1)', background: 'var(--card)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--line)'}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--red-bg)', color: 'var(--red)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {notice && (
            <div style={{
              background: 'var(--green-bg)', color: 'var(--green)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', fontWeight: 600,
            }}>
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              background: loading ? 'var(--t3)' : 'var(--blue)',
              color: '#fff', fontWeight: 700, fontSize: '15px',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px', transition: 'background 0.15s',
            }}
          >
            {loading ? '처리 중...' : (isRegister ? '회원가입' : '로그인')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--t3)' }}>
            {isRegister ? '이미 계정이 있나요? ' : '계정이 없나요? '}
          </span>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700, color: 'var(--blue)',
            }}
          >
            {isRegister ? '로그인' : '회원가입'}
          </button>
        </div>
      </div>
    </div>
  );
}
