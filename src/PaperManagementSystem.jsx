import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Save, FileText, Users } from 'lucide-react';

export default function PaperManagementSystem() {
  const [papers, setPapers] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [todos, setTodos] = useState([]);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('papers');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAmount, setFilterAmount] = useState('all');
  const [filterDays, setFilterDays] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('paper');
  const [editItem, setEditItem] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState(null);
  const [customTodoForm, setCustomTodoForm] = useState({ name: '', note: '' });
  
  const [paperForm, setPaperForm] = useState({
    titleCN: '', titleEN: '', status: 'preparing', firstAuthor: '', correspondingAuthor: '', 
    secondAuthor: '', journal: '', submissionDate: '', statusDate: '', notes: '', serialNumber: 0,
    submissionLink: '', submissionEmail: '', submissionPassword: '', contactEmail: '', contactPassword: ''
  });

  const [authorForm, setAuthorForm] = useState({
    name: '', wechat: '', phone: '', email: '', contractDate: '', 
    cooperationAmounts: [], affiliations: [''], researchField: [], authorPositions: {}
  });

  // 获取作者在各论文中的位置
  const getAuthorPapers = (authorName) => {
    return papers.filter(p => 
      p.firstAuthor === authorName || 
      p.correspondingAuthor === authorName || 
      p.secondAuthor === authorName
    ).map(p => ({
      paperId: p.id,
      paperTitle: p.titleCN || p.titleEN,
      position: p.firstAuthor === authorName ? 'first' : 
                p.correspondingAuthor === authorName ? 'corresponding' : 'second'
    }));
  };

  const statusOpts = [
    { v: 'preparing', l: '准备中', c: 'bg-gray-100 text-gray-800' },
    { v: 'submitted', l: '已投稿', c: 'bg-blue-100 text-blue-800' },
    { v: 'under_review', l: '审稿中', c: 'bg-yellow-100 text-yellow-800' },
    { v: 'revision_pending', l: '待返修', c: 'bg-orange-100 text-orange-800' },
    { v: 'final_review', l: '最终审查', c: 'bg-purple-100 text-purple-800' },
    { v: 'accepted', l: '已录用', c: 'bg-green-100 text-green-800' },
    { v: 'published', l: '已发表', c: 'bg-emerald-100 text-emerald-800' },
    { v: 'rejected', l: '已被拒', c: 'bg-red-100 text-red-800' }
  ];

  const finalReviewOpts = [
    { v: '', l: '暂无' },
    { v: 'major_revision', l: '大修', c: 'bg-orange-100 text-orange-800' },
    { v: 'minor_revision', l: '小修', c: 'bg-yellow-100 text-yellow-800' },
    { v: 'accept_as_is', l: '直接接收', c: 'bg-green-100 text-green-800' },
    { v: 'reject', l: '拒稿', c: 'bg-red-100 text-red-800' },
    { v: 'revise_resubmit', l: '修改后重投', c: 'bg-blue-100 text-blue-800' }
  ];

  const journals = ['Frontiers in Psychology', 'Frontiers in Public Health', 'Frontiers in Psychiatry'];

  const calcDays = (d) => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 0;
  const calcTotal = (amts) => amts ? amts.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) : 0;
  const getFields = () => [...new Set(papers.filter(p => p.titleCN).map(p => p.titleCN))];

  // 生成待办事项
  useEffect(() => {
    const generateTodos = () => {
      const newTodos = [];
      const today = new Date().toDateString();
      
      papers.forEach(paper => {
        const todoId = `paper-${paper.id}`;
        const existingTodo = todos.find(t => t.id === todoId);
        const days = paper.statusDate ? calcDays(paper.statusDate) : 0;
        
        // 待返修：直接展示
        if (paper.status === 'revision_pending' && paper.statusDate) {
          if (!existingTodo || !existingTodo.handled) {
            newTodos.push({
              id: todoId,
              paperId: paper.id,
              type: 'revision',
              title: paper.titleCN || paper.titleEN,
              status: '待返修',
              days: days,
              lastRemindDate: today,
              handled: existingTodo?.handled || false
            });
          }
        }
        
        // 审稿中、最终审查：每2天提醒一次
        if ((paper.status === 'under_review' || paper.status === 'final_review') && paper.statusDate) {
          const lastRemind = existingTodo?.lastRemindDate ? new Date(existingTodo.lastRemindDate) : null;
          const daysSinceRemind = lastRemind ? Math.floor((new Date() - lastRemind) / 86400000) : 999;
          
          if (!existingTodo || daysSinceRemind >= 2) {
            newTodos.push({
              id: todoId,
              paperId: paper.id,
              type: paper.status === 'under_review' ? 'review' : 'final',
              title: paper.titleCN || paper.titleEN,
              status: statusOpts.find(s => s.v === paper.status)?.l,
              days: days,
              lastRemindDate: today,
              handled: false
            });
          } else if (existingTodo && !existingTodo.handled) {
            newTodos.push(existingTodo);
          }
        }
        
        // 准备中：每天提醒一次
        if (paper.status === 'preparing' && paper.statusDate) {
          const lastRemind = existingTodo?.lastRemindDate ? new Date(existingTodo.lastRemindDate).toDateString() : null;
          
          if (!existingTodo || lastRemind !== today) {
            newTodos.push({
              id: todoId,
              paperId: paper.id,
              type: 'preparing',
              title: paper.titleCN || paper.titleEN,
              status: '准备中',
              days: days,
              lastRemindDate: today,
              handled: false
            });
          } else if (existingTodo && !existingTodo.handled) {
            newTodos.push(existingTodo);
          }
        }
      });
      
      setTodos(newTodos);
    };
    
    if (papers.length > 0) {
      generateTodos();
    }
  }, [papers]);

  const handleTodo = (todoId, action) => {
    const todo = todos.find(t => t.id === todoId);
    if (action === 'done') {
      setTodos(todos.map(t => t.id === todoId ? {...t, handled: true} : t));
      notify('已标记为已办理');
      if (todo) addHistory('处理', '待办', `已办理待办：${todo.title}`);
    } else if (action === 'ignore') {
      setTodos(todos.filter(t => t.id !== todoId));
      notify('已忽略');
      if (todo) addHistory('处理', '待办', `忽略待办：${todo.title}`);
    } else if (action === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTodos(todos.map(t => t.id === todoId ? {...t, lastRemindDate: tomorrow.toDateString(), handled: false} : t));
      notify('已设置明天提醒');
      if (todo) addHistory('处理', '待办', `明天提醒：${todo.title}`);
    }
  };

  const notify = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addHistory = (action, target, details) => {
    const newRecord = {
      id: Date.now(),
      action,
      target,
      details,
      timestamp: new Date().toISOString()
    };
    setHistory([newRecord, ...history]);
  };

  const filteredPapers = useMemo(() => {
    let result = papers.filter(p => filterStatus === 'all' || p.status === filterStatus);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.titleCN && p.titleCN.toLowerCase().includes(q)) ||
        (p.titleEN && p.titleEN.toLowerCase().includes(q)) ||
        (p.firstAuthor && p.firstAuthor.toLowerCase().includes(q)) ||
        (p.correspondingAuthor && p.correspondingAuthor.toLowerCase().includes(q)) ||
        (p.secondAuthor && p.secondAuthor.toLowerCase().includes(q)) ||
        (p.journal && p.journal.toLowerCase().includes(q)) ||
        (p.serialNumber && p.serialNumber.toString().includes(q))
      );
    }
    
    return result;
  }, [papers, filterStatus, searchQuery]);

  const filteredAuthors = useMemo(() => {
    let result = authors.filter(a => {
      if (filterAmount !== 'all') {
        const t = calcTotal(a.cooperationAmounts);
        if (filterAmount === 'no' && t > 0) return false;
        if (filterAmount === 'under10k' && t >= 10000) return false;
        if (filterAmount === '10k-20k' && (t < 10000 || t >= 20000)) return false;
        if (filterAmount === 'over20k' && t < 20000) return false;
      }
      if (filterDays !== 'all' && a.contractDate) {
        const d = calcDays(a.contractDate);
        if (filterDays === 'under30' && d >= 30) return false;
        if (filterDays === '30-90' && (d < 30 || d >= 90)) return false;
        if (filterDays === 'over90' && d < 90) return false;
      }
      if (filterDays !== 'all' && !a.contractDate) return false;
      return true;
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.wechat && a.wechat.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q)) ||
        (calcTotal(a.cooperationAmounts).toString().includes(q))
      );
    }
    
    return result;
  }, [authors, filterAmount, filterDays, searchQuery]);

  const resetForm = () => {
    setPaperForm({ titleCN: '', titleEN: '', status: 'preparing', firstAuthor: '', correspondingAuthor: '', secondAuthor: '', journal: '', submissionDate: '', statusDate: '', notes: '', serialNumber: 0, submissionLink: '', submissionEmail: '', submissionPassword: '', contactEmail: '', contactPassword: '' });
    setAuthorForm({ name: '', wechat: '', phone: '', email: '', contractDate: '', cooperationAmounts: [], affiliations: [''], researchField: [], authorPositions: {} });
    setCustomTodoForm({ name: '', note: '' });
    setEditItem(null);
    setShowModal(false);
  };

  const savePaper = () => {
    if (!paperForm.titleCN && !paperForm.titleEN) {
      notify('请填写题目', 'error');
      return;
    }
    
    // 自动添加不存在的作者
    const allAuthorNames = [paperForm.firstAuthor, paperForm.correspondingAuthor, paperForm.secondAuthor].filter(name => name && name.trim());
    const existingAuthorNames = authors.map(a => a.name);
    const newAuthors = [];
    
    allAuthorNames.forEach(name => {
      if (!existingAuthorNames.includes(name) && !newAuthors.find(a => a.name === name)) {
        newAuthors.push({
          id: Date.now() + Math.random(),
          name: name,
          wechat: '',
          phone: '',
          email: '',
          contractDate: '',
          cooperationAmounts: [],
          affiliations: [''],
          researchField: [],
          authorPositions: {}
        });
      }
    });
    
    if (newAuthors.length > 0) {
      setAuthors([...authors, ...newAuthors]);
      notify(`已自动添加 ${newAuthors.length} 位新作者`);
      newAuthors.forEach(a => {
        addHistory('添加', '作者', `自动添加作者：${a.name}`);
      });
    }
    
    if (editItem) {
      setPapers(papers.map(p => p.id === editItem.id ? {...paperForm, id: p.id} : p));
      addHistory('编辑', '论文', `编辑论文：${paperForm.titleCN || paperForm.titleEN}`);
    } else {
      const num = papers.length > 0 ? Math.max(...papers.map(p => p.serialNumber || 0)) + 1 : 1;
      setPapers([...papers, {...paperForm, id: Date.now(), serialNumber: num}]);
      addHistory('添加', '论文', `添加论文：${paperForm.titleCN || paperForm.titleEN}`);
    }
    notify('已保存');
    resetForm();
  };

  const saveAuthor = () => {
    if (!authorForm.name) {
      notify('请填写姓名', 'error');
      return;
    }
    if (editItem) {
      setAuthors(authors.map(a => a.id === editItem.id ? {...authorForm, id: a.id} : a));
      addHistory('编辑', '作者', `编辑作者：${authorForm.name}`);
    } else {
      setAuthors([...authors, {...authorForm, id: Date.now()}]);
      addHistory('添加', '作者', `添加作者：${authorForm.name}`);
    }
    notify('已保存');
    resetForm();
  };

  const saveCustomTodo = () => {
    if (!customTodoForm.name.trim()) {
      notify('请填写事项名称', 'error');
      return;
    }
    
    const newTodo = {
      id: `custom-${Date.now()}`,
      paperId: null,
      type: 'custom',
      title: customTodoForm.name,
      status: '自定义事项',
      note: customTodoForm.note,
      days: 0,
      lastRemindDate: new Date().toDateString(),
      handled: false,
      createdAt: new Date().toISOString()
    };
    
    setTodos([...todos, newTodo]);
    addHistory('添加', '待办', `添加自定义事项：${customTodoForm.name}`);
    notify('事项已添加');
    resetForm();
  };

  const exportCSV = () => {
    // 导出论文CSV
    const paperHeaders = ['序号', '中文题目', '英文题目', '状态', '一作', '通讯', '二作', '期刊', '投稿日期', '投稿链接', '投稿邮箱', '投稿密码', '联系邮箱', '联系密码', '状态更新日期', '备注'];
    const paperRows = papers.map(p => [
      p.serialNumber || '',
      p.titleCN || '',
      p.titleEN || '',
      statusOpts.find(s => s.v === p.status)?.l || p.status || '',
      p.firstAuthor || '',
      p.correspondingAuthor || '',
      p.secondAuthor || '',
      p.journal || '',
      p.submissionDate || '',
      p.submissionLink || '',
      p.submissionEmail || '',
      p.submissionPassword || '',
      p.contactEmail || '',
      p.contactPassword || '',
      p.statusDate || '',
      p.notes || ''
    ]);
    
    const paperCSV = [paperHeaders, ...paperRows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const paperBlob = new Blob(['\ufeff' + paperCSV], { type: 'text/csv;charset=utf-8;' });
    const paperUrl = URL.createObjectURL(paperBlob);
    const paperLink = document.createElement('a');
    paperLink.href = paperUrl;
    paperLink.download = `论文列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    paperLink.click();
    URL.revokeObjectURL(paperUrl);
    
    // 导出作者CSV
    const authorHeaders = ['姓名', '微信', '电话', '邮箱', '签约日期', '研究方向', '总金额'];
    const authorRows = authors.map(a => [
      a.name || '',
      a.wechat || '',
      a.phone || '',
      a.email || '',
      a.contractDate || '',
      (a.researchField || []).join(';'),
      calcTotal(a.cooperationAmounts) || 0
    ]);
    
    const authorCSV = [authorHeaders, ...authorRows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const authorBlob = new Blob(['\ufeff' + authorCSV], { type: 'text/csv;charset=utf-8;' });
    const authorUrl = URL.createObjectURL(authorBlob);
    const authorLink = document.createElement('a');
    authorLink.href = authorUrl;
    authorLink.download = `作者列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    authorLink.click();
    URL.revokeObjectURL(authorUrl);
    
    notify('导出成功（已导出2个CSV文件）');
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        
        // 判断是JSON还是CSV
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          if (data.papers) setPapers(data.papers);
          if (data.authors) setAuthors(data.authors);
          notify('JSON导入成功');
        } else if (file.name.endsWith('.csv')) {
          // CSV导入
          const lines = content.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            notify('CSV文件格式错误', 'error');
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          
          // 判断是论文还是作者CSV
          if (headers.includes('中文题目') || headers.includes('英文题目')) {
            // 导入论文
            const newPapers = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].match(/("([^"]|"")*"|[^,]+)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
              const paper = {
                id: Date.now() + i,
                serialNumber: values[0] || 0,
                titleCN: values[1] || '',
                titleEN: values[2] || '',
                status: statusOpts.find(s => s.l === values[3])?.v || 'preparing',
                firstAuthor: values[4] || '',
                correspondingAuthor: values[5] || '',
                secondAuthor: values[6] || '',
                journal: values[7] || '',
                submissionDate: values[8] || '',
                submissionLink: values[9] || '',
                submissionEmail: values[10] || '',
                submissionPassword: values[11] || '',
                contactEmail: values[12] || '',
                contactPassword: values[13] || '',
                statusDate: values[14] || '',
                notes: values[15] || ''
              };
              newPapers.push(paper);
            }
            setPapers([...papers, ...newPapers]);
            notify(`导入了 ${newPapers.length} 篇论文`);
          } else if (headers.includes('姓名')) {
            // 导入作者
            const newAuthors = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].match(/("([^"]|"")*"|[^,]+)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
              const author = {
                id: Date.now() + i,
                name: values[0] || '',
                wechat: values[1] || '',
                phone: values[2] || '',
                email: values[3] || '',
                contractDate: values[4] || '',
                researchField: values[5] ? values[5].split(';') : [],
                cooperationAmounts: [],
                affiliations: [''],
                authorPositions: {}
              };
              newAuthors.push(author);
            }
            setAuthors([...authors, ...newAuthors]);
            notify(`导入了 ${newAuthors.length} 位作者`);
          } else {
            notify('无法识别CSV文件类型', 'error');
          }
        }
      } catch (err) {
        notify('导入失败：' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6">论文投稿管理系统</h1>
          
          <div className="flex gap-3 mb-6 flex-wrap">
            <button onClick={() => setViewMode('papers')} className={'flex items-center gap-2 px-4 py-2 rounded-lg ' + (viewMode === 'papers' ? 'bg-blue-600 text-white' : 'bg-gray-100')}>
              <FileText size={20} />论文视图
            </button>
            <button onClick={() => setViewMode('authors')} className={'flex items-center gap-2 px-4 py-2 rounded-lg ' + (viewMode === 'authors' ? 'bg-blue-600 text-white' : 'bg-gray-100')}>
              <Users size={20} />作者视图
            </button>
            <button onClick={() => setViewMode('todos')} className={'flex items-center gap-2 px-4 py-2 rounded-lg relative ' + (viewMode === 'todos' ? 'bg-orange-600 text-white' : 'bg-gray-100')}>
              📋 待办事项
              {todos.filter(t => !t.handled).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {todos.filter(t => !t.handled).length}
                </span>
              )}
            </button>
            <button onClick={() => setViewMode('history')} className={'flex items-center gap-2 px-2 py-1 rounded text-xs ' + (viewMode === 'history' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700')}>
              📜 处理历史
            </button>
            <div className="flex-1"></div>
            
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 搜索论文、作者、序号、金额..."
                className="px-4 py-2 border rounded-lg w-64 text-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              📤 导出
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
              📥 导入
              <input type="file" accept=".json,.csv" onChange={importData} className="hidden" />
            </label>
            
            {viewMode === 'papers' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">所有状态</option>
                {statusOpts.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            )}
            
            {viewMode === 'authors' && (
              <>
                <select value={filterAmount} onChange={e => setFilterAmount(e.target.value)} className="px-4 py-2 border rounded-lg">
                  <option value="all">所有金额</option>
                  <option value="no">无合作</option>
                  <option value="under10k">1万以下</option>
                  <option value="10k-20k">1-2万</option>
                  <option value="over20k">2万以上</option>
                </select>
                <select value={filterDays} onChange={e => setFilterDays(e.target.value)} className="px-4 py-2 border rounded-lg">
                  <option value="all">所有签约</option>
                  <option value="under30">30天内</option>
                  <option value="30-90">30-90天</option>
                  <option value="over90">90天以上</option>
                </select>
              </>
            )}
            
            <button onClick={() => { setModalType(viewMode === 'papers' ? 'paper' : viewMode === 'authors' ? 'author' : 'customTodo'); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
              <Plus size={20} />{viewMode === 'papers' ? '添加论文' : viewMode === 'authors' ? '添加作者' : '添加事项'}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {viewMode === 'papers' ? '显示 ' + filteredPapers.length + ' / ' + papers.length + ' 篇' : 
             viewMode === 'authors' ? '显示 ' + filteredAuthors.length + ' / ' + authors.length + ' 位' :
             viewMode === 'todos' ? '待办事项 ' + todos.filter(t => !t.handled).length + ' 项' :
             '历史记录 ' + history.length + ' 条'}
          </div>
        </div>

        {viewMode === 'papers' && (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredPapers.sort((a,b) => (a.serialNumber||0)-(b.serialNumber||0)).map(p => {
              const title = p.titleCN ? (p.titleCN.length > 20 ? p.titleCN.substring(0, 20) + '...' : p.titleCN) : (p.titleEN || '无题');
              const subDays = p.submissionDate ? calcDays(p.submissionDate) : null;
              return (
                <div key={p.id} onClick={() => setSelectedPaper(p)} className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md">
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {p.serialNumber || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold flex-1">{title}</h2>
                        <span className={'px-3 py-1 rounded-full text-xs ' + (statusOpts.find(s => s.v === p.status)?.c || 'bg-gray-100')}>
                          {statusOpts.find(s => s.v === p.status)?.l || p.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="font-medium text-blue-600">{subDays !== null ? '已投稿 ' + subDays + ' 天' : '尚未投稿'}</div>
                    {p.statusDate && <div>状态存续：{calcDays(p.statusDate)} 天</div>}
                    <div>通讯：{p.correspondingAuthor || '-'}</div>
                    <div>一作：{p.firstAuthor || '-'}</div>
                    <div>二作：{p.secondAuthor || '-'}</div>
                  </div>
                </div>
              );
            })}
            {filteredPapers.length === 0 && (
              <div className="col-span-2 bg-white rounded p-12 text-center text-gray-500">
                {papers.length === 0 ? '暂无论文，点击右上角"添加论文"开始' : '无筛选结果'}
              </div>
            )}
          </div>
        )}

        {viewMode === 'authors' && (
          <div className="grid md:grid-cols-3 gap-4">
            {filteredAuthors.map(a => (
              <div key={a.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{a.name}</h3>
                    {a.contractDate && (
                      <div className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 inline-block mt-2">
                        签约：{a.contractDate} ({calcDays(a.contractDate)}天)
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditItem(a); setAuthorForm({...a, cooperationAmounts: a.cooperationAmounts || [], affiliations: a.affiliations || ['']}); setModalType('author'); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setDeleteConfirm({type:'author', id:a.id, name:a.name})} className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  {a.researchField && a.researchField.length > 0 && (
                    <div>
                      <div className="font-medium mb-1">研究方向：</div>
                      <div className="flex flex-wrap gap-1">
                        {a.researchField.map((f,i) => <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{f}</span>)}
                      </div>
                    </div>
                  )}
                  {getAuthorPapers(a.name).length > 0 && (
                    <div>
                      <div className="font-medium mb-1">作者位置：</div>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(getAuthorPapers(a.name).map(ap => ap.position))].map((p,i) => {
                          const lbl = p==='first'?'一作':p==='corresponding'?'通讯':'二作';
                          const color = p==='first'?'bg-blue-100 text-blue-800':p==='corresponding'?'bg-green-100 text-green-800':'bg-purple-100 text-purple-800';
                          return <span key={i} className={`px-2 py-1 ${color} text-xs rounded-full`}>{lbl}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {a.authorPositions && Object.keys(a.authorPositions).length > 0 && (
                    <div>
                      <div className="font-medium mb-1">参与论文：</div>
                      <div className="text-xs text-gray-500">
                        {getAuthorPapers(a.name).length} 篇
                      </div>
                    </div>
                  )}
                  {a.cooperationAmounts && a.cooperationAmounts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      总金额：<span className="font-bold text-amber-700">¥{calcTotal(a.cooperationAmounts).toLocaleString()}</span>
                    </div>
                  )}
                  {a.email && <div>邮箱：{a.email}</div>}
                  {a.wechat && <div>微信：{a.wechat}</div>}
                </div>
              </div>
            ))}
            {filteredAuthors.length === 0 && (
              <div className="col-span-3 bg-white rounded p-12 text-center text-gray-500">
                {authors.length === 0 ? '暂无作者' : '无筛选结果'}
              </div>
            )}
          </div>
        )}

        {viewMode === 'todos' && (
          <div className="space-y-4">
            {todos.filter(t => !t.handled).length === 0 ? (
              <div className="bg-white rounded p-12 text-center text-gray-500">
                🎉 暂无待办事项
              </div>
            ) : (
              todos.filter(t => !t.handled).map(todo => (
                <div key={todo.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {todo.type === 'preparing' && <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">⏳</div>}
                      {todo.type === 'review' && <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">🔍</div>}
                      {todo.type === 'final' && <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">📋</div>}
                      {todo.type === 'revision' && <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">✏️</div>}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{todo.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-600 mb-3">
                        <span className={'px-3 py-1 rounded-full ' + (statusOpts.find(s => s.l === todo.status)?.c || 'bg-gray-100')}>
                          {todo.status}
                        </span>
                        <span className="font-bold text-orange-600">已持续 {todo.days} 天</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {todo.type === 'preparing' && '提醒：该论文仍在准备中，请及时跟进'}
                        {todo.type === 'review' && '提醒：该论文正在审稿中，请关注审稿进度'}
                        {todo.type === 'final' && '提醒：该论文正在最终审查阶段，请密切关注'}
                        {todo.type === 'revision' && '提醒：该论文需要返修，请尽快处理'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => {
                        const paper = papers.find(p => p.id === todo.paperId);
                        if (paper) setSelectedPaper(paper);
                      }} className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        查看详情
                      </button>
                      {(todo.type === 'preparing' || todo.type === 'review' || todo.type === 'final') && (
                        <button onClick={() => handleTodo(todo.id, 'tomorrow')} className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                          明天提醒我
                        </button>
                      )}
                      <button onClick={() => handleTodo(todo.id, 'done')} className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200">
                        已办理
                      </button>
                      <button onClick={() => handleTodo(todo.id, 'ignore')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        忽略
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'history' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">操作历史记录</h2>
              {history.length > 0 && (
                <button 
                  onClick={() => {
                    if (window.confirm('确定要清空所有历史记录吗？')) {
                      setHistory([]);
                      notify('已清空历史记录');
                    }
                  }}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  清空历史
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">暂无操作记录</div>
            ) : (
              <div className="space-y-2">
                {history.map(record => {
                  const date = new Date(record.timestamp);
                  const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                  return (
                    <div key={record.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded hover:bg-gray-100">
                      <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-white">
                        {record.action === '添加' && '➕'}
                        {record.action === '编辑' && '✏️'}
                        {record.action === '处理' && '✅'}
                        {record.action === '删除' && '🗑️'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={'px-2 py-1 rounded text-xs font-medium ' + 
                            (record.action === '添加' ? 'bg-green-100 text-green-800' :
                             record.action === '编辑' ? 'bg-blue-100 text-blue-800' :
                             record.action === '处理' ? 'bg-orange-100 text-orange-800' :
                             'bg-red-100 text-red-800')}>
                            {record.action}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">{record.target}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">{record.details}</div>
                        <div className="text-xs text-gray-500">{timeStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPaper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-auto" onClick={() => setSelectedPaper(null)}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8" onClick={e => e.stopPropagation()}>
              <div className="border-b p-6 flex justify-between">
                <div className="flex gap-3">
                  <button onClick={() => setSelectedPaper(null)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <span>←</span>返回
                  </button>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      {selectedPaper.serialNumber}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedPaper.titleCN || selectedPaper.titleEN}</h2>
                      {selectedPaper.titleCN && selectedPaper.titleEN && <div className="text-gray-600 italic mt-1">{selectedPaper.titleEN}</div>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedPaper(null)}><X size={24} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <div className="text-sm font-medium mb-2">投稿日期</div>
                    <div className="px-4 py-2 bg-blue-50 rounded">{selectedPaper.submissionDate || '尚未投稿'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">状态更新</div>
                    <input type="date" value={selectedPaper.statusDate || ''} onChange={e => {
                      const up = {...selectedPaper, statusDate: e.target.value};
                      setPapers(papers.map(p => p.id === selectedPaper.id ? up : p));
                      setSelectedPaper(up);
                    }} className="px-4 py-2 border rounded" />
                  </div>
                  {selectedPaper.statusDate && (
                    <div>
                      <div className="text-sm font-medium mb-2">状态存续</div>
                      <div className="px-4 py-2 bg-green-50 rounded border border-green-300">
                        <span className="text-green-700 font-bold text-2xl">{calcDays(selectedPaper.statusDate)}</span> 天
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium mb-2">状态</div>
                    <select value={selectedPaper.status} onChange={e => {
                      const up = {...selectedPaper, status: e.target.value, statusDate: new Date().toISOString().split('T')[0]};
                      setPapers(papers.map(p => p.id === selectedPaper.id ? up : p));
                      setSelectedPaper(up);
                    }} className="px-4 py-2 border rounded cursor-pointer">
                      {statusOpts.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                  <div className="flex-1"></div>
                  <button onClick={() => { setPaperForm(selectedPaper); setEditItem(selectedPaper); setModalType('paper'); setShowModal(true); setSelectedPaper(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
                    <Edit2 size={18} />编辑
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded"><div className="text-sm font-medium mb-1">一作</div><div className="font-bold">{selectedPaper.firstAuthor || '-'}</div></div>
                  <div className="bg-green-50 p-4 rounded"><div className="text-sm font-medium mb-1">通讯</div><div className="font-bold">{selectedPaper.correspondingAuthor || '-'}</div></div>
                  <div className="bg-purple-50 p-4 rounded"><div className="text-sm font-medium mb-1">二作</div><div className="font-bold">{selectedPaper.secondAuthor || '-'}</div></div>
                </div>

                {selectedPaper.journal && <div><div className="text-sm font-medium mb-2">期刊</div><div>{selectedPaper.journal}</div></div>}
                {selectedPaper.submissionLink && (
                  <div>
                    <div className="text-sm font-medium mb-2">投稿链接</div>
                    <a href={selectedPaper.submissionLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      {selectedPaper.submissionLink}
                    </a>
                  </div>
                )}
                
                {(selectedPaper.submissionEmail || selectedPaper.contactEmail) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedPaper.submissionEmail && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <div className="text-sm font-medium mb-2 text-blue-900">投稿账号</div>
                        <div className="text-sm space-y-1">
                          <div><span className="text-gray-600">邮箱：</span>{selectedPaper.submissionEmail}</div>
                          <div><span className="text-gray-600">密码：</span>{selectedPaper.submissionPassword || '-'}</div>
                        </div>
                      </div>
                    )}
                    {selectedPaper.contactEmail && (
                      <div className="bg-green-50 border border-green-200 rounded p-4">
                        <div className="text-sm font-medium mb-2 text-green-900">联系邮箱</div>
                        <div className="text-sm space-y-1">
                          <div><span className="text-gray-600">邮箱：</span>{selectedPaper.contactEmail}</div>
                          <div><span className="text-gray-600">密码：</span>{selectedPaper.contactPassword || '-'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedPaper.notes && <div><div className="text-sm font-medium mb-2">备注</div><div className="bg-gray-50 p-3 rounded">{selectedPaper.notes}</div></div>}

                <div className="flex justify-end pt-4 border-t">
                  <button onClick={() => setDeleteConfirm({type:'paper', id:selectedPaper.id, name:selectedPaper.titleCN||selectedPaper.titleEN})} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg">
                    <Trash2 size={18} />删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
              <div className="flex justify-between p-6 border-b">
                <div className="flex gap-3">
                  <button onClick={resetForm} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"><span>←</span>返回</button>
                  <h2 className="text-2xl font-bold">{modalType === 'paper' ? (editItem ? '编辑论文' : '添加论文') : modalType === 'author' ? (editItem ? '编辑作者' : '添加作者') : '添加自定义事项'}</h2>
                </div>
                <button onClick={resetForm}><X size={24} /></button>
              </div>

              {modalType === 'customTodo' ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">事项名称 *</label>
                    <input 
                      value={customTodoForm.name} 
                      onChange={e => setCustomTodoForm({...customTodoForm, name: e.target.value})} 
                      className="w-full px-4 py-3 border rounded-lg" 
                      placeholder="例如：联系XX期刊编辑部"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">提醒备注</label>
                    <textarea 
                      value={customTodoForm.note} 
                      onChange={e => setCustomTodoForm({...customTodoForm, note: e.target.value})} 
                      rows={4}
                      className="w-full px-4 py-3 border rounded-lg" 
                      placeholder="备注信息..."
                    />
                  </div>
                  <div className="flex gap-3 pt-4 border-t">
                    <button onClick={saveCustomTodo} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Save size={20} />添加事项
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                  </div>
                </div>
              ) : modalType === 'paper' ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">中文题目 *</label>
                    <textarea value={paperForm.titleCN} onChange={e => setPaperForm({...paperForm, titleCN: e.target.value})} className="w-full px-4 py-3 border rounded-lg" rows={3} placeholder="请输入论文的中文题目" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">英文题目</label>
                    <textarea value={paperForm.titleEN} onChange={e => setPaperForm({...paperForm, titleEN: e.target.value})} className="w-full px-4 py-3 border rounded-lg" rows={3} placeholder="请输入论文的英文题目" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">一作</label>
                      <div className="flex gap-2">
                        {paperForm.firstAuthor && authors.find(a => a.name === paperForm.firstAuthor) && (
                          <button 
                            type="button"
                            onClick={() => {
                              const author = authors.find(a => a.name === paperForm.firstAuthor);
                              setAuthorForm({...author, cooperationAmounts: author.cooperationAmounts || [], affiliations: author.affiliations || ['']});
                              setEditItem(author);
                              setModalType('author');
                            }}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm flex-shrink-0"
                          >
                            查看
                          </button>
                        )}
                        <input value={paperForm.firstAuthor} onChange={e => setPaperForm({...paperForm, firstAuthor: e.target.value})} className="flex-1 px-4 py-3 border rounded-lg" placeholder="第一作者" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">通讯</label>
                      <div className="flex gap-2">
                        {paperForm.correspondingAuthor && authors.find(a => a.name === paperForm.correspondingAuthor) && (
                          <button 
                            type="button"
                            onClick={() => {
                              const author = authors.find(a => a.name === paperForm.correspondingAuthor);
                              setAuthorForm({...author, cooperationAmounts: author.cooperationAmounts || [], affiliations: author.affiliations || ['']});
                              setEditItem(author);
                              setModalType('author');
                            }}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm flex-shrink-0"
                          >
                            查看
                          </button>
                        )}
                        <input value={paperForm.correspondingAuthor} onChange={e => setPaperForm({...paperForm, correspondingAuthor: e.target.value})} className="flex-1 px-4 py-3 border rounded-lg" placeholder="通讯作者" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">二作</label>
                      <div className="flex gap-2">
                        {paperForm.secondAuthor && authors.find(a => a.name === paperForm.secondAuthor) && (
                          <button 
                            type="button"
                            onClick={() => {
                              const author = authors.find(a => a.name === paperForm.secondAuthor);
                              setAuthorForm({...author, cooperationAmounts: author.cooperationAmounts || [], affiliations: author.affiliations || ['']});
                              setEditItem(author);
                              setModalType('author');
                            }}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm flex-shrink-0"
                          >
                            查看
                          </button>
                        )}
                        <input value={paperForm.secondAuthor} onChange={e => setPaperForm({...paperForm, secondAuthor: e.target.value})} className="flex-1 px-4 py-3 border rounded-lg" placeholder="第二作者" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">期刊</label>
                    <select value={paperForm.journal} onChange={e => setPaperForm({...paperForm, journal: e.target.value})} className="w-full px-4 py-3 border rounded-lg">
                      <option value="">选择期刊</option>
                      {journals.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">投稿链接</label>
                    <input type="url" value={paperForm.submissionLink} onChange={e => setPaperForm({...paperForm, submissionLink: e.target.value})} className="w-full px-4 py-3 border rounded-lg" placeholder="https://..." />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-medium mb-3 text-blue-900">投稿账号信息</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">投稿邮箱</label>
                        <input type="email" value={paperForm.submissionEmail} onChange={e => setPaperForm({...paperForm, submissionEmail: e.target.value})} className="w-full px-4 py-3 border rounded-lg" placeholder="submission@email.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">投稿密码</label>
                        <input type="text" value={paperForm.submissionPassword} onChange={e => setPaperForm({...paperForm, submissionPassword: e.target.value})} className="w-full px-4 py-3 border rounded-lg" placeholder="密码" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-medium text-green-900">联系邮箱信息</div>
                      <button 
                        type="button"
                        onClick={() => setPaperForm({
                          ...paperForm, 
                          contactEmail: paperForm.submissionEmail, 
                          contactPassword: paperForm.submissionPassword
                        })}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        与投稿邮箱一致
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">联系邮箱</label>
                        <input type="email" value={paperForm.contactEmail} onChange={e => setPaperForm({...paperForm, contactEmail: e.target.value})} className="w-full px-4 py-3 border rounded-lg" placeholder="contact@email.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">联系密码</label>
                        <input type="text" value={paperForm.contactPassword} onChange={e => setPaperForm({...paperForm, contactPassword: e.target.value})} className="w-full px-4 py-3 border rounded-lg" placeholder="密码" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">投稿日期</label>
                    <input type="date" value={paperForm.submissionDate} onChange={e => setPaperForm({...paperForm, submissionDate: e.target.value})} className="w-full px-4 py-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">状态</label>
                    <select value={paperForm.status} onChange={e => setPaperForm({...paperForm, status: e.target.value})} className="w-full px-4 py-3 border rounded-lg">
                      {statusOpts.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">备注</label>
                    <textarea value={paperForm.notes} onChange={e => setPaperForm({...paperForm, notes: e.target.value})} rows={3} className="w-full px-4 py-3 border rounded-lg" placeholder="其他备注信息" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t">
                    <button onClick={savePaper} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Save size={20} />{editItem ? '保存修改' : '添加论文'}
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">姓名 *</label>
                    <input value={authorForm.name} onChange={e => setAuthorForm({...authorForm, name: e.target.value})} className="w-full px-4 py-3 border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">微信</label>
                      <input value={authorForm.wechat} onChange={e => setAuthorForm({...authorForm, wechat: e.target.value})} className="w-full px-4 py-3 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">电话</label>
                      <input value={authorForm.phone} onChange={e => setAuthorForm({...authorForm, phone: e.target.value})} className="w-full px-4 py-3 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">签约日期</label>
                    <input type="date" value={authorForm.contractDate} onChange={e => setAuthorForm({...authorForm, contractDate: e.target.value})} className="w-full px-4 py-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">研究方向</label>
                    {getFields().length === 0 ? (
                      <div className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3">请先添加论文</div>
                    ) : (
                      <div className="border rounded p-3 max-h-48 overflow-y-auto">
                        {getFields().map(f => (
                          <label key={f} className="flex gap-2 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={(authorForm.researchField || []).includes(f)} onChange={e => {
                              if (e.target.checked) {
                                setAuthorForm({...authorForm, researchField: [...(authorForm.researchField || []), f]});
                              } else {
                                setAuthorForm({...authorForm, researchField: (authorForm.researchField || []).filter(x => x !== f)});
                              }
                            }} />
                            <span className="text-sm flex-1">{f}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {editItem && (
                    <div>
                      <label className="block text-sm font-medium mb-2">参与论文及作者位置</label>
                      {getAuthorPapers(editItem.name).length === 0 ? (
                        <div className="text-sm bg-gray-50 border rounded p-3">该作者暂未参与任何论文</div>
                      ) : (
                        <div className="space-y-2">
                          {getAuthorPapers(editItem.name).map((ap, idx) => (
                            <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3 flex justify-between items-center">
                              <div>
                                <div className="font-medium">{ap.paperTitle}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  当前位置：
                                  <span className={'ml-2 px-2 py-1 rounded-full text-xs ' + 
                                    (ap.position === 'first' ? 'bg-blue-100 text-blue-800' : 
                                     ap.position === 'corresponding' ? 'bg-green-100 text-green-800' : 
                                     'bg-purple-100 text-purple-800')}>
                                    {ap.position === 'first' ? '一作' : ap.position === 'corresponding' ? '通讯' : '二作'}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const paper = papers.find(p => p.id === ap.paperId);
                                  if (paper) {
                                    setSelectedPaper(paper);
                                    resetForm();
                                  }
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                查看详情
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">合作金额</label>
                      <button onClick={() => setAuthorForm({...authorForm, cooperationAmounts: [...(authorForm.cooperationAmounts||[]), {amount:'', date:'', project:'', position:'', note:''}]})} className="text-sm px-3 py-2 bg-amber-600 text-white rounded flex items-center gap-1">
                        <Plus size={16} />添加
                      </button>
                    </div>
                    {(!authorForm.cooperationAmounts || authorForm.cooperationAmounts.length === 0) ? (
                      <div className="text-sm bg-gray-50 border rounded p-3">暂无记录</div>
                    ) : (
                      <div className="space-y-3">
                        {authorForm.cooperationAmounts.map((it, idx) => (
                          <div key={idx} className="bg-amber-50 p-4 rounded border border-amber-300">
                            <div className="flex justify-between mb-3">
                              <span className="text-sm font-bold">#{idx+1}</span>
                              <button onClick={() => setAuthorForm({...authorForm, cooperationAmounts: authorForm.cooperationAmounts.filter((v,i) => i!==idx)})} className="text-red-600"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium mb-1">项目</label>
                                <select value={it.project||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], project: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 text-sm border rounded bg-white">
                                  <option value="">选择</option>
                                  {getFields().map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">位置</label>
                                <select value={it.position||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], position: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 text-sm border rounded bg-white">
                                  <option value="">选择</option>
                                  <option value="first">一作</option>
                                  <option value="corresponding">通讯</option>
                                  <option value="second">二作</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">金额</label>
                                <input type="number" value={it.amount||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], amount: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 border rounded" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">日期</label>
                                <input type="date" value={it.date||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], date: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 border rounded" />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium mb-1">备注</label>
                                <input value={it.note||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], note: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 border rounded" />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="bg-amber-200 border-2 border-amber-400 rounded p-4 text-center">
                          <span className="text-sm font-medium">总金额：</span>
                          <span className="text-2xl font-bold text-amber-800 ml-2">¥{calcTotal(authorForm.cooperationAmounts).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4 border-t">
                    <button onClick={saveAuthor} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg">
                      <Save size={20} />{editItem ? '保存' : '添加'}
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-gray-100 rounded-lg">取消</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
              <div className="text-6xl mb-2">🗑️</div>
              <h3 className="text-2xl font-bold text-white">确认删除</h3>
            </div>
            <div className="p-6">
              <p className="text-center mb-2">即将删除{deleteConfirm.type === 'author' ? '作者' : '论文'}：</p>
              <p className="text-2xl font-bold text-center mb-4">{deleteConfirm.name}</p>
              <div className="bg-red-50 border-2 border-red-200 rounded p-3 mb-6 text-center text-red-700 font-bold">⚠️ 无法撤销</div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-6 py-3 bg-gray-100 rounded-lg font-medium">取消</button>
                <button onClick={() => {
                  if (deleteConfirm.type === 'author') {
                    setAuthors(authors.filter(a => a.id !== deleteConfirm.id));
                    notify('已删除');
                  } else {
                    setPapers(papers.filter(p => p.id !== deleteConfirm.id));
                    setSelectedPaper(null);
                    notify('已删除');
                  }
                  setDeleteConfirm(null);
                }} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium">确定删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <div className={'px-6 py-4 rounded-lg shadow-lg text-white ' + (notification.type === 'error' ? 'bg-red-600' : 'bg-green-600')}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}