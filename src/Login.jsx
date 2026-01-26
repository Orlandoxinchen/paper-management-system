import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

// 🔐 固定的账号密码列表（在这里添加账号）
const VALID_ACCOUNTS = [
  { email: 'admin@yce.com', password: 'adminxinchen' },
  { email: 'user1@yce.com', password: 'user1231' },
  { email: 'user2@yce.com', password: 'user2342' },
  // 👆 在这里添加更多账号...
];

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">论文投稿管理系统</h1>
          <p className="text-slate-600">Paper Submission Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            <LogIn size={24} className="inline mr-2" />
            登录系统
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail size={16} className="inline mr-2" />
                邮箱账号
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Lock size={16} className="inline mr-2" />
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg font-medium"
            >
              <LogIn size={20} />
              <span>登录</span>
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-600 text-center">
              🔒 请使用管理员提供的账号密码登录
            </p>
          </div>
        </div>

        {/* 测试账号提示（可选，生产环境可删除） */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            💡 测试账号: admin@yce.com / adminxinchen
          </p>
        </div>
      </div>
    </div>
  );
} 