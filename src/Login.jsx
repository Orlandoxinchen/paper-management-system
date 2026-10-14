import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, BookOpen, Check, ShieldCheck } from 'lucide-react';

function getConfiguredAccounts() {
  const accountsJson = import.meta.env.VITE_LOGIN_ACCOUNTS;

  if (accountsJson) {
    try {
      const parsed = JSON.parse(accountsJson);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (account) =>
            typeof account?.email === 'string' &&
            account.email.trim() &&
            typeof account?.password === 'string' &&
            account.password.trim()
        );
      }
    } catch (error) {
      console.error('VITE_LOGIN_ACCOUNTS 配置格式错误:', error);
    }
  }

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim();
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD?.trim();

  if (adminEmail && adminPassword) {
    return [{ email: adminEmail, password: adminPassword }];
  }

  return [];
}

const VALID_ACCOUNTS = getConfiguredAccounts();

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const loginConfigured = VALID_ACCOUNTS.length > 0;

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!loginConfigured) {
      setError('系统尚未配置登录账号，请先在 Vercel 环境变量中设置登录信息。');
      return;
    }

    // 验证账号密码
    const validAccount = VALID_ACCOUNTS.find(
      acc => acc.email === email && acc.password === password
    );

    if (validAccount) {
      // 登录成功
      const user = { email: email, id: email };
      localStorage.setItem('paper_system_user', JSON.stringify(user));
      onLoginSuccess(user);
    } else {
      setError('邮箱或密码错误，请重试');
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="系统介绍">
        <div className="login-brand__inner">
          <div className="login-brand__mark"><BookOpen size={28} /></div>
          <p className="login-brand__edition">Editorial Operations</p>
          <h1>让每一篇研究<br />都有清晰的进程。</h1>
          <p className="login-brand__lead">
            从作者协作、投稿状态到研究材料，集中在一套有秩序的编辑工作台中。
          </p>
          <div className="login-brand__features">
            <div><Check size={17} /><span>投稿与审稿进度统一追踪</span></div>
            <div><Check size={17} /><span>作者、期刊和附件集中管理</span></div>
            <div><Check size={17} /><span>待办与操作记录完整留痕</span></div>
          </div>
        </div>
        <p className="login-brand__footer">Paper Submission Management System</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__heading">
            <span className="login-card__icon"><ShieldCheck size={22} /></span>
            <div>
              <p>管理后台</p>
              <h2>登录编辑工作台</h2>
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              <span><Mail size={16} />邮箱账号</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="username"
                required
              />
            </label>

            <label>
              <span><Lock size={16} />密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入登录密码"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={!loginConfigured} className="login-submit">
              <span>进入工作台</span>
              <LogIn size={19} />
            </button>
          </form>

          <p className="login-card__note">
            仅限获授权的编辑与研究管理人员访问
          </p>
        </div>
      </section>
    </main>
  );
}
