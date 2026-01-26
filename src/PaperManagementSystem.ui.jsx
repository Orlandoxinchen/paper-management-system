import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Save, FileText, Users, Search, Download, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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
    submissionLink: '', submissionEmail: '', submissionPassword: '', contactEmail: '', contactPassword: '',
    files: { word: null, pdf: null, excel: null } // 新增文件存储
  });

  const [authorForm, setAuthorForm] = useState({
    name: '', wechat: '', phone: '', email: '', contractDate: '', 
    cooperationAmounts: [], affiliations: [''], researchField: [], authorPositions: {}
  });

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
    { v: 'preparing', l: '准备中', c: 'bg-slate-100 text-slate-700', icon: '📝' },
    { v: 'submitted', l: '已投稿', c: 'bg-blue-100 text-blue-700', icon: '📤' },
    { v: 'under_review', l: '审稿中', c: 'bg-amber-100 text-amber-700', icon: '🔍' },
    { v: 'revision_pending', l: '待返修', c: 'bg-orange-100 text-orange-700', icon: '✏️' },
    { v: 'final_review', l: '最终审查', c: 'bg-purple-100 text-purple-700', icon: '📋' },
    { v: 'accepted', l: '已录用', c: 'bg-emerald-100 text-emerald-700', icon: '✅' },
    { v: 'published', l: '已发表', c: 'bg-green-100 text-green-700', icon: '🎉' },
    { v: 'rejected', l: '已被拒', c: 'bg-red-100 text-red-700', icon: '❌' }
  ];

  const journals = ['Frontiers in Psychology', 'Frontiers in Public Health', 'Frontiers in Psychiatry'];

  const calcDays = (d) => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 0;
  const calcTotal = (amts) => amts ? amts.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) : 0;
  const getFields = () => [...new Set(papers.filter(p => p.titleCN).map(p => p.titleCN))];

  useEffect(() => {
    const generateTodos = () => {
      const newTodos = [];
      const today = new Date().toDateString();
      
      papers.forEach(paper => {
        const todoId = `paper-${paper.id}`;
        const existingTodo = todos.find(t => t.id === todoId);
        const days = paper.statusDate ? calcDays(paper.statusDate) : 0;
        
        if (paper.status === 'revision_pending' && paper.statusDate) {
          if (!existingTodo || !existingTodo.handled) {
            newTodos.push({
              id: todoId, paperId: paper.id, type: 'revision',
              title: paper.titleCN || paper.titleEN, status: '待返修',
              days: days, lastRemindDate: today, handled: existingTodo?.handled || false
            });
          }
        }
        
        if ((paper.status === 'under_review' || paper.status === 'final_review') && paper.statusDate) {
          const lastRemind = existingTodo?.lastRemindDate ? new Date(existingTodo.lastRemindDate) : null;
          const daysSinceRemind = lastRemind ? Math.floor((new Date() - lastRemind) / 86400000) : 999;
          
          if (!existingTodo || daysSinceRemind >= 2) {
            newTodos.push({
              id: todoId, paperId: paper.id,
              type: paper.status === 'under_review' ? 'review' : 'final',
              title: paper.titleCN || paper.titleEN,
              status: statusOpts.find(s => s.v === paper.status)?.l,
              days: days, lastRemindDate: today, handled: false
            });
          } else if (existingTodo && !existingTodo.handled) {
            newTodos.push(existingTodo);
          }
        }
        
        if (paper.status === 'preparing' && paper.statusDate) {
          const lastRemind = existingTodo?.lastRemindDate ? new Date(existingTodo.lastRemindDate).toDateString() : null;
          
          if (!existingTodo || lastRemind !== today) {
            newTodos.push({
              id: todoId, paperId: paper.id, type: 'preparing',
              title: paper.titleCN || paper.titleEN, status: '准备中',
              days: days, lastRemindDate: today, handled: false
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
    setHistory([{ id: Date.now(), action, target, details, timestamp: new Date().toISOString() }, ...history]);
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
    setPaperForm({ titleCN: '', titleEN: '', status: 'preparing', firstAuthor: '', correspondingAuthor: '', secondAuthor: '', journal: '', submissionDate: '', statusDate: '', notes: '', serialNumber: 0, submissionLink: '', submissionEmail: '', submissionPassword: '', contactEmail: '', contactPassword: '', files: { word: null, pdf: null, excel: null } });
    setAuthorForm({ name: '', wechat: '', phone: '', email: '', contractDate: '', cooperationAmounts: [], affiliations: [''], researchField: [], authorPositions: {} });
    setCustomTodoForm({ name: '', note: '' });
    setEditItem(null);
    setShowModal(false);
  };

  // 新增：文件上传处理
  const handleFileUpload = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    const validTypes = {
      word: ['.doc', '.docx', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      pdf: ['.pdf', 'application/pdf'],
      excel: ['.xls', '.xlsx', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    };
    
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isValidType = validTypes[fileType].some(type => 
      type.startsWith('.') ? fileExtension === type : file.type === type
    );
    
    if (!isValidType) {
      notify(`请上传正确的${fileType === 'word' ? 'Word' : fileType === 'pdf' ? 'PDF' : 'Excel'}文件`, 'error');
      return;
    }
    
    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify('文件大小不能超过10MB', 'error');
      return;
    }
    
    // 读取文件并转换为Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        data: event.target.result,
        uploadDate: new Date().toISOString()
      };
      
      setPaperForm({
        ...paperForm,
        files: {
          ...paperForm.files,
          [fileType]: fileData
        }
      });
      
      notify(`${file.name} 上传成功`);
    };
    
    reader.onerror = () => {
      notify('文件读取失败', 'error');
    };
    
    reader.readAsDataURL(file);
    e.target.value = ''; // 清空input，允许重复上传同名文件
  };

  // 新增：文件下载处理
  const handleFileDownload = (fileData) => {
    if (!fileData) return;
    
    const link = document.createElement('a');
    link.href = fileData.data;
    link.download = fileData.name;
    link.click();
    notify(`${fileData.name} 下载成功`);
  };

  // 新增：文件删除处理
  const handleFileDelete = (fileType) => {
    if (window.confirm('确定要删除这个文件吗？')) {
      setPaperForm({
        ...paperForm,
        files: {
          ...paperForm.files,
          [fileType]: null
        }
      });
      notify('文件已删除');
    }
  };

  const savePaper = () => {
    if (!paperForm.titleCN && !paperForm.titleEN) {
      notify('请填写题目', 'error');
      return;
    }
    
    const allAuthorNames = [paperForm.firstAuthor, paperForm.correspondingAuthor, paperForm.secondAuthor].filter(name => name && name.trim());
    const existingAuthorNames = authors.map(a => a.name);
    const newAuthors = [];
    
    allAuthorNames.forEach(name => {
      if (!existingAuthorNames.includes(name) && !newAuthors.find(a => a.name === name)) {
        newAuthors.push({
          id: Date.now() + Math.random(), name: name, wechat: '', phone: '', email: '',
          contractDate: '', cooperationAmounts: [], affiliations: [''], researchField: [], authorPositions: {}
        });
      }
    });
    
    if (newAuthors.length > 0) {
      setAuthors([...authors, ...newAuthors]);
      notify(`已自动添加 ${newAuthors.length} 位新作者`);
      newAuthors.forEach(a => addHistory('添加', '作者', `自动添加作者：${a.name}`));
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
      id: `custom-${Date.now()}`, paperId: null, type: 'custom',
      title: customTodoForm.name, status: '自定义事项', note: customTodoForm.note,
      days: 0, lastRemindDate: new Date().toDateString(), handled: false,
      createdAt: new Date().toISOString()
    };
    setTodos([...todos, newTodo]);
    addHistory('添加', '待办', `添加自定义事项：${customTodoForm.name}`);
    notify('事项已添加');
    resetForm();
  };

  const exportCSV = () => {
    const paperHeaders = ['序号', '中文题目', '英文题目', '状态', '一作', '通讯', '二作', '期刊', '投稿日期', '投稿链接', '投稿邮箱', '投稿密码', '联系邮箱', '联系密码', '状态更新日期', '备注'];
    const paperRows = papers.map(p => [
      p.serialNumber || '', p.titleCN || '', p.titleEN || '',
      statusOpts.find(s => s.v === p.status)?.l || p.status || '',
      p.firstAuthor || '', p.correspondingAuthor || '', p.secondAuthor || '',
      p.journal || '', p.submissionDate || '', p.submissionLink || '',
      p.submissionEmail || '', p.submissionPassword || '',
      p.contactEmail || '', p.contactPassword || '',
      p.statusDate || '', p.notes || ''
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
    
    const authorHeaders = ['姓名', '微信', '电话', '邮箱', '签约日期', '研究方向', '总金额'];
    const authorRows = authors.map(a => [
      a.name || '', a.wechat || '', a.phone || '', a.email || '',
      a.contractDate || '', (a.researchField || []).join(';'),
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
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          if (data.papers) setPapers(data.papers);
          if (data.authors) setAuthors(data.authors);
          notify('JSON导入成功');
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            notify('CSV文件格式错误', 'error');
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          
          if (headers.includes('中文题目') || headers.includes('英文题目')) {
            const newPapers = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].match(/("([^"]|"")*"|[^,]+)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
              newPapers.push({
                id: Date.now() + i, serialNumber: values[0] || 0,
                titleCN: values[1] || '', titleEN: values[2] || '',
                status: statusOpts.find(s => s.l === values[3])?.v || 'preparing',
                firstAuthor: values[4] || '', correspondingAuthor: values[5] || '',
                secondAuthor: values[6] || '', journal: values[7] || '',
                submissionDate: values[8] || '', submissionLink: values[9] || '',
                submissionEmail: values[10] || '', submissionPassword: values[11] || '',
                contactEmail: values[12] || '', contactPassword: values[13] || '',
                statusDate: values[14] || '', notes: values[15] || '',
                files: { word: null, pdf: null, excel: null }
              });
            }
            setPapers([...papers, ...newPapers]);
            notify(`导入了 ${newPapers.length} 篇论文`);
          } else if (headers.includes('姓名')) {
            const newAuthors = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].match(/("([^"]|"")*"|[^,]+)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
              newAuthors.push({
                id: Date.now() + i, name: values[0] || '',
                wechat: values[1] || '', phone: values[2] || '',
                email: values[3] || '', contractDate: values[4] || '',
                researchField: values[5] ? values[5].split(';') : [],
                cooperationAmounts: [], affiliations: [''], authorPositions: {}
              });
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

  // 第一部分结束，请回复"继续"获取第二部分
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">论文投稿管理系统</h1>
              <p className="text-sm text-slate-500 mt-1">Paper Submission Management System</p>
            </div>
            <div className="flex gap-3">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm">
                <Download size={18} />
                导出
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors cursor-pointer shadow-sm">
                <Upload size={18} />
                导入
                <input type="file" accept=".json,.csv" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            {/* View Mode */}
            <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('papers')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'papers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileText size={18} />
                论文
              </button>
              <button 
                onClick={() => setViewMode('authors')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'authors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Users size={18} />
                作者
              </button>
              <button 
                onClick={() => setViewMode('todos')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all relative ${viewMode === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <AlertCircle size={18} />
                待办
                {todos.filter(t => !t.handled).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium">
                    {todos.filter(t => !t.handled).length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setViewMode('history')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Clock size={18} />
                历史
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Filters */}
            {viewMode === 'papers' && (
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">所有状态</option>
                {statusOpts.map(s => <option key={s.v} value={s.v}>{s.icon} {s.l}</option>)}
              </select>
            )}
            
            {viewMode === 'authors' && (
              <>
                <select 
                  value={filterAmount} 
                  onChange={e => setFilterAmount(e.target.value)} 
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">所有金额</option>
                  <option value="no">无合作</option>
                  <option value="under10k">1万以下</option>
                  <option value="10k-20k">1-2万</option>
                  <option value="over20k">2万以上</option>
                </select>
                <select 
                  value={filterDays} 
                  onChange={e => setFilterDays(e.target.value)} 
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">所有签约</option>
                  <option value="under30">30天内</option>
                  <option value="30-90">30-90天</option>
                  <option value="over90">90天以上</option>
                </select>
              </>
            )}
            
            {/* Add Button */}
            <button 
              onClick={() => { 
                setModalType(viewMode === 'papers' ? 'paper' : viewMode === 'authors' ? 'author' : 'customTodo'); 
                setShowModal(true); 
              }} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors ml-auto shadow-sm"
            >
              <Plus size={18} />
              {viewMode === 'papers' ? '添加论文' : viewMode === 'authors' ? '添加作者' : '添加事项'}
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
            {viewMode === 'papers' && `显示 ${filteredPapers.length} / ${papers.length} 篇论文`}
            {viewMode === 'authors' && `显示 ${filteredAuthors.length} / ${authors.length} 位作者`}
            {viewMode === 'todos' && `待办事项 ${todos.filter(t => !t.handled).length} 项`}
            {viewMode === 'history' && `历史记录 ${history.length} 条`}
          </div>
        </div>

        {/* Papers View */}
        {viewMode === 'papers' && (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredPapers.sort((a,b) => (a.serialNumber||0)-(b.serialNumber||0)).map(p => {
              const title = p.titleCN ? (p.titleCN.length > 40 ? p.titleCN.substring(0, 40) + '...' : p.titleCN) : (p.titleEN || '无题');
              const subDays = p.submissionDate ? calcDays(p.submissionDate) : null;
              const statusInfo = statusOpts.find(s => s.v === p.status);
              
              return (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedPaper(p)} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                >
                  <div className="flex gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
                      {p.serialNumber || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-2">{title}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo?.c || 'bg-slate-100 text-slate-700'}`}>
                        <span>{statusInfo?.icon}</span>
                        {statusInfo?.l || p.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <Clock size={16} />
                      {subDays !== null ? `已投稿 ${subDays} 天` : '尚未投稿'}
                    </div>
                    {p.statusDate && (
                      <div className="text-slate-600">状态存续：{calcDays(p.statusDate)} 天</div>
                    )}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                      <div>通讯：{p.correspondingAuthor || '-'}</div>
                      <div>一作：{p.firstAuthor || '-'}</div>
                      {p.secondAuthor && <div>二作：{p.secondAuthor}</div>}
                    </div>
                    {/* 显示附件数量 */}
                    {p.files && (p.files.word || p.files.pdf || p.files.excel) && (
                      <div className="pt-2 border-t border-slate-100 flex gap-1">
                        {p.files.word && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">📄 Word</span>}
                        {p.files.pdf && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">📕 PDF</span>}
                        {p.files.excel && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">📊 Excel</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredPapers.length === 0 && (
              <div className="col-span-2 bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">
                  {papers.length === 0 ? '暂无论文，点击右上角"添加论文"开始' : '无筛选结果'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Authors View */}
        {viewMode === 'authors' && (
          <div className="grid md:grid-cols-3 gap-4">
            {filteredAuthors.map(a => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{a.name}</h3>
                    {a.contractDate && (
                      <div className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 font-medium">
                        <CheckCircle size={14} />
                        签约 {calcDays(a.contractDate)} 天
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { 
                        setEditItem(a); 
                        setAuthorForm({...a, cooperationAmounts: a.cooperationAmounts || [], affiliations: a.affiliations || ['']}); 
                        setModalType('author'); 
                        setShowModal(true); 
                      }} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({type:'author', id:a.id, name:a.name})} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  {a.researchField && a.researchField.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">研究方向</div>
                      <div className="flex flex-wrap gap-1">
                        {a.researchField.map((f,i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {getAuthorPapers(a.name).length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">作者位置</div>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(getAuthorPapers(a.name).map(ap => ap.position))].map((p,i) => {
                          const lbl = p==='first'?'一作':p==='corresponding'?'通讯':'二作';
                          const color = p==='first'?'bg-blue-50 text-blue-700':p==='corresponding'?'bg-emerald-50 text-emerald-700':'bg-violet-50 text-violet-700';
                          return <span key={i} className={`px-2 py-1 ${color} text-xs rounded-md font-medium`}>{lbl}</span>;
                        })}
                        <span className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded-md">
                          {getAuthorPapers(a.name).length} 篇
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {a.cooperationAmounts && a.cooperationAmounts.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                      <div className="text-xs text-amber-700 mb-1">合作总额</div>
                      <div className="text-xl font-bold text-amber-800">
                        ¥{calcTotal(a.cooperationAmounts).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                    {a.email && <div className="truncate">📧 {a.email}</div>}
                    {a.wechat && <div>💬 {a.wechat}</div>}
                    {a.phone && <div>📱 {a.phone}</div>}
                  </div>
                </div>
              </div>
            ))}
            {filteredAuthors.length === 0 && (
              <div className="col-span-3 bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Users size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">
                  {authors.length === 0 ? '暂无作者' : '无筛选结果'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Todos View */}
        {viewMode === 'todos' && (
          <div className="space-y-4">
            {todos.filter(t => !t.handled).length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
                <p className="text-lg font-medium text-slate-700">🎉 暂无待办事项</p>
                <p className="text-sm text-slate-500 mt-1">所有任务都已完成</p>
              </div>
            ) : (
              todos.filter(t => !t.handled).map(todo => {
                const getBgColor = () => {
                  if (todo.type === 'preparing') return 'from-slate-50 to-slate-100';
                  if (todo.type === 'review') return 'from-amber-50 to-amber-100';
                  if (todo.type === 'final') return 'from-purple-50 to-purple-100';
                  if (todo.type === 'revision') return 'from-orange-50 to-orange-100';
                  return 'from-slate-50 to-slate-100';
                };
                
                return (
                  <div key={todo.id} className={`bg-gradient-to-r ${getBgColor()} rounded-xl shadow-sm border border-slate-200 p-6`}>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm">
                          {todo.type === 'preparing' && '⏳'}
                          {todo.type === 'review' && '🔍'}
                          {todo.type === 'final' && '📋'}
                          {todo.type === 'revision' && '✏️'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{todo.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusOpts.find(s => s.l === todo.status)?.c || 'bg-slate-100 text-slate-700'}`}>
                            {todo.status}
                          </span>
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                            已持续 {todo.days} 天
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {todo.type === 'preparing' && '提醒：该论文仍在准备中，请及时跟进'}
                          {todo.type === 'review' && '提醒：该论文正在审稿中，请关注审稿进度'}
                          {todo.type === 'final' && '提醒：该论文正在最终审查阶段，请密切关注'}
                          {todo.type === 'revision' && '提醒：该论文需要返修，请尽快处理'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            const paper = papers.find(p => p.id === todo.paperId);
                            if (paper) setSelectedPaper(paper);
                          }} 
                          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          查看详情
                        </button>
                        {(todo.type === 'preparing' || todo.type === 'review' || todo.type === 'final') && (
                          <button 
                            onClick={() => handleTodo(todo.id, 'tomorrow')} 
                            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            明天提醒
                          </button>
                        )}
                        <button 
                          onClick={() => handleTodo(todo.id, 'done')} 
                          className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          已办理
                        </button>
                        <button 
                          onClick={() => handleTodo(todo.id, 'ignore')} 
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          忽略
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">操作历史记录</h2>
              {history.length > 0 && (
                <button 
                  onClick={() => {
                    if (window.confirm('确定要清空所有历史记录吗？')) {
                      setHistory([]);
                      notify('已清空历史记录');
                    }
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                >
                  清空历史
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">暂无操作记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(record => {
                  const date = new Date(record.timestamp);
                  const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                  const getColor = () => {
                    if (record.action === '添加') return 'from-emerald-50 to-emerald-100';
                    if (record.action === '编辑') return 'from-blue-50 to-blue-100';
                    if (record.action === '处理') return 'from-orange-50 to-orange-100';
                    return 'from-red-50 to-red-100';
                  };
                  
                  return (
                    <div key={record.id} className={`flex items-start gap-4 p-4 bg-gradient-to-r ${getColor()} rounded-lg border border-slate-200`}>
                      <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm">
                        {record.action === '添加' && '➕'}
                        {record.action === '编辑' && '✏️'}
                        {record.action === '处理' && '✅'}
                        {record.action === '删除' && '🗑️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                            record.action === '添加' ? 'bg-emerald-600 text-white' :
                            record.action === '编辑' ? 'bg-blue-600 text-white' :
                            record.action === '处理' ? 'bg-orange-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {record.action}
                          </span>
                          <span className="px-2 py-1 bg-white rounded-md text-xs font-medium text-slate-700 border border-slate-200">
                            {record.target}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 font-medium mb-1">{record.details}</div>
                        <div className="text-xs text-slate-500">{timeStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 第二部分结束，请回复"继续"获取第三部分（包含文件上传功能的弹窗）*/}
      {/* Paper Detail Modal - 论文详情弹窗 */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto flex items-center justify-center p-4" onClick={() => setSelectedPaper(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center font-bold text-2xl backdrop-blur-sm">
                    {selectedPaper.serialNumber}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPaper.titleCN || selectedPaper.titleEN}</h2>
                    {selectedPaper.titleCN && selectedPaper.titleEN && (
                      <p className="text-blue-100 text-sm mt-1 italic">{selectedPaper.titleEN}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedPaper(null)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-2">投稿日期</label>
                  <div className="px-4 py-3 bg-blue-50 rounded-lg text-slate-700 font-medium border border-blue-100">
                    {selectedPaper.submissionDate || '尚未投稿'}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-2">状态更新日期</label>
                  <input 
                    type="date" 
                    value={selectedPaper.statusDate || ''} 
                    onChange={e => {
                      const up = {...selectedPaper, statusDate: e.target.value};
                      setPapers(papers.map(p => p.id === selectedPaper.id ? up : p));
                      setSelectedPaper(up);
                    }} 
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {selectedPaper.statusDate && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 mb-2">状态存续</label>
                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200 text-center">
                      <span className="text-3xl font-bold text-emerald-700">{calcDays(selectedPaper.statusDate)}</span>
                      <span className="text-sm text-emerald-600 ml-2">天</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">当前状态</label>
                  <select 
                    value={selectedPaper.status} 
                    onChange={e => {
                      const up = {...selectedPaper, status: e.target.value, statusDate: new Date().toISOString().split('T')[0]};
                      setPapers(papers.map(p => p.id === selectedPaper.id ? up : p));
                      setSelectedPaper(up);
                    }} 
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {statusOpts.map(s => <option key={s.v} value={s.v}>{s.icon} {s.l}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => { 
                    setPaperForm(selectedPaper); 
                    setEditItem(selectedPaper); 
                    setModalType('paper'); 
                    setShowModal(true); 
                    setSelectedPaper(null); 
                  }} 
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Edit2 size={18} />
                  编辑论文
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="text-xs font-medium text-blue-700 mb-1">第一作者</div>
                  <div className="text-lg font-bold text-blue-900">{selectedPaper.firstAuthor || '-'}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                  <div className="text-xs font-medium text-emerald-700 mb-1">通讯作者</div>
                  <div className="text-lg font-bold text-emerald-900">{selectedPaper.correspondingAuthor || '-'}</div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-4 rounded-xl border border-violet-200">
                  <div className="text-xs font-medium text-violet-700 mb-1">第二作者</div>
                  <div className="text-lg font-bold text-violet-900">{selectedPaper.secondAuthor || '-'}</div>
                </div>
              </div>

              {selectedPaper.journal && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">投稿期刊</label>
                  <div className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                    {selectedPaper.journal}
                  </div>
                </div>
              )}

              {selectedPaper.submissionLink && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">投稿链接</label>
                  <a 
                    href={selectedPaper.submissionLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block px-4 py-3 bg-slate-50 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors border border-slate-200 break-all"
                  >
                    {selectedPaper.submissionLink}
                  </a>
                </div>
              )}
              
              {(selectedPaper.submissionEmail || selectedPaper.contactEmail) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedPaper.submissionEmail && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-blue-900 mb-3">投稿账号信息</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 font-medium min-w-[60px]">邮箱：</span>
                          <span className="text-slate-700 break-all">{selectedPaper.submissionEmail}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 font-medium min-w-[60px]">密码：</span>
                          <span className="text-slate-700">{selectedPaper.submissionPassword || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedPaper.contactEmail && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-emerald-900 mb-3">联系邮箱信息</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-medium min-w-[60px]">邮箱：</span>
                          <span className="text-slate-700 break-all">{selectedPaper.contactEmail}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 font-medium min-w-[60px]">密码：</span>
                          <span className="text-slate-700">{selectedPaper.contactPassword || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {selectedPaper.notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">备注信息</label>
                  <div className="px-4 py-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-200 whitespace-pre-wrap">
                    {selectedPaper.notes}
                  </div>
                </div>
              )}

              {/* 新增：显示附件文件 */}
              {selectedPaper.files && (selectedPaper.files.word || selectedPaper.files.pdf || selectedPaper.files.excel) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">📎 附件文件</label>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedPaper.files.word && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">📄</div>
                          <span className="text-sm font-medium text-blue-900">Word</span>
                        </div>
                        <div className="text-xs text-slate-600 truncate mb-2" title={selectedPaper.files.word.name}>
                          {selectedPaper.files.word.name}
                        </div>
                        <button
                          onClick={() => handleFileDownload(selectedPaper.files.word)}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          下载文件
                        </button>
                      </div>
                    )}
                    {selectedPaper.files.pdf && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">📕</div>
                          <span className="text-sm font-medium text-red-900">PDF</span>
                        </div>
                        <div className="text-xs text-slate-600 truncate mb-2" title={selectedPaper.files.pdf.name}>
                          {selectedPaper.files.pdf.name}
                        </div>
                        <button
                          onClick={() => handleFileDownload(selectedPaper.files.pdf)}
                          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                        >
                          下载文件
                        </button>
                      </div>
                    )}
                    {selectedPaper.files.excel && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">📊</div>
                          <span className="text-sm font-medium text-green-900">Excel</span>
                        </div>
                        <div className="text-xs text-slate-600 truncate mb-2" title={selectedPaper.files.excel.name}>
                          {selectedPaper.files.excel.name}
                        </div>
                        <button
                          onClick={() => handleFileDownload(selectedPaper.files.excel)}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          下载文件
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button 
                  onClick={() => setDeleteConfirm({type:'paper', id:selectedPaper.id, name:selectedPaper.titleCN||selectedPaper.titleEN})} 
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Trash2 size={18} />
                  删除论文
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal - 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {modalType === 'paper' ? (editItem ? '编辑论文' : '添加论文') : 
                   modalType === 'author' ? (editItem ? '编辑作者' : '添加作者') : 
                   '添加自定义事项'}
                </h2>
                <button onClick={resetForm} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {modalType === 'customTodo' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">事项名称 *</label>
                    <input 
                      value={customTodoForm.name} 
                      onChange={e => setCustomTodoForm({...customTodoForm, name: e.target.value})} 
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="例如：联系XX期刊编辑部"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">提醒备注</label>
                    <textarea 
                      value={customTodoForm.note} 
                      onChange={e => setCustomTodoForm({...customTodoForm, note: e.target.value})} 
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="备注信息..."
                    />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button onClick={saveCustomTodo} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm">
                      <Save size={20} />添加事项
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">取消</button>
                  </div>
                </div>
              ) : modalType === 'paper' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">中文题目 *</label>
                    <textarea value={paperForm.titleCN} onChange={e => setPaperForm({...paperForm, titleCN: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请输入论文的中文题目" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">英文题目</label>
                    <textarea value={paperForm.titleEN} onChange={e => setPaperForm({...paperForm, titleEN: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请输入论文的英文题目" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">一作</label>
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
                        <input value={paperForm.firstAuthor} onChange={e => setPaperForm({...paperForm, firstAuthor: e.target.value})} className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="第一作者" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">通讯</label>
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
                        <input value={paperForm.correspondingAuthor} onChange={e => setPaperForm({...paperForm, correspondingAuthor: e.target.value})} className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="通讯作者" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">二作</label>
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
                        <input value={paperForm.secondAuthor} onChange={e => setPaperForm({...paperForm, secondAuthor: e.target.value})} className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="第二作者" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">期刊</label>
                    <select value={paperForm.journal} onChange={e => setPaperForm({...paperForm, journal: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">选择期刊</option>
                      {journals.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">投稿链接</label>
                    <input type="url" value={paperForm.submissionLink} onChange={e => setPaperForm({...paperForm, submissionLink: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="font-medium mb-3 text-blue-900">投稿账号信息</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">投稿邮箱</label>
                        <input type="email" value={paperForm.submissionEmail} onChange={e => setPaperForm({...paperForm, submissionEmail: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="submission@email.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">投稿密码</label>
                        <input type="text" value={paperForm.submissionPassword} onChange={e => setPaperForm({...paperForm, submissionPassword: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="密码" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-medium text-emerald-900">联系邮箱信息</div>
                      <button 
                        type="button"
                        onClick={() => setPaperForm({
                          ...paperForm, 
                          contactEmail: paperForm.submissionEmail, 
                          contactPassword: paperForm.submissionPassword
                        })}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors"
                      >
                        与投稿邮箱一致
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">联系邮箱</label>
                        <input type="email" value={paperForm.contactEmail} onChange={e => setPaperForm({...paperForm, contactEmail: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="contact@email.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">联系密码</label>
                        <input type="text" value={paperForm.contactPassword} onChange={e => setPaperForm({...paperForm, contactPassword: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="密码" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">投稿日期</label>
                    <input type="date" value={paperForm.submissionDate} onChange={e => setPaperForm({...paperForm, submissionDate: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
                    <select value={paperForm.status} onChange={e => setPaperForm({...paperForm, status: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {statusOpts.map(s => <option key={s.v} value={s.v}>{s.icon} {s.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
                    <textarea value={paperForm.notes} onChange={e => setPaperForm({...paperForm, notes: e.target.value})} rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="其他备注信息" />
                  </div>
                  
                  {/* 新增：文件上传区域 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="font-medium mb-3 text-slate-900">📎 附件文件</div>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Word文件 */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-lg">📄</div>
                          <span className="text-sm font-medium text-slate-700">Word</span>
                        </div>
                        {paperForm.files?.word ? (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-600 truncate" title={paperForm.files.word.name}>
                              {paperForm.files.word.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {(paperForm.files.word.size / 1024).toFixed(1)} KB
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleFileDownload(paperForm.files.word)}
                                className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                              >
                                下载
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFileDelete('word')}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept=".doc,.docx"
                              onChange={(e) => handleFileUpload(e, 'word')}
                              className="hidden"
                            />
                            <div className="px-3 py-2 bg-blue-50 text-blue-600 rounded text-xs text-center cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                              + 上传Word
                            </div>
                          </label>
                        )}
                      </div>

                      {/* PDF文件 */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-lg">📕</div>
                          <span className="text-sm font-medium text-slate-700">PDF</span>
                        </div>
                        {paperForm.files?.pdf ? (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-600 truncate" title={paperForm.files.pdf.name}>
                              {paperForm.files.pdf.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {(paperForm.files.pdf.size / 1024).toFixed(1)} KB
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleFileDownload(paperForm.files.pdf)}
                                className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                              >
                                下载
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFileDelete('pdf')}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => handleFileUpload(e, 'pdf')}
                              className="hidden"
                            />
                            <div className="px-3 py-2 bg-red-50 text-red-600 rounded text-xs text-center cursor-pointer hover:bg-red-100 transition-colors border border-red-200">
                              + 上传PDF
                            </div>
                          </label>
                        )}
                      </div>

                      {/* Excel文件 */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-lg">📊</div>
                          <span className="text-sm font-medium text-slate-700">Excel</span>
                        </div>
                        {paperForm.files?.excel ? (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-600 truncate" title={paperForm.files.excel.name}>
                              {paperForm.files.excel.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {(paperForm.files.excel.size / 1024).toFixed(1)} KB
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleFileDownload(paperForm.files.excel)}
                                className="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                              >
                                下载
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFileDelete('excel')}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept=".xls,.xlsx"
                              onChange={(e) => handleFileUpload(e, 'excel')}
                              className="hidden"
                            />
                            <div className="px-3 py-2 bg-green-50 text-green-600 rounded text-xs text-center cursor-pointer hover:bg-green-100 transition-colors border border-green-200">
                              + 上传Excel
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      💡 提示：支持上传Word、PDF、Excel文件，单个文件最大10MB，新上传的文件会自动覆盖旧文件
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button onClick={savePaper} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm">
                      <Save size={20} />{editItem ? '保存修改' : '添加论文'}
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">取消</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">姓名 *</label>
                    <input value={authorForm.name} onChange={e => setAuthorForm({...authorForm, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">微信</label>
                      <input value={authorForm.wechat} onChange={e => setAuthorForm({...authorForm, wechat: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">电话</label>
                      <input value={authorForm.phone} onChange={e => setAuthorForm({...authorForm, phone: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">邮箱</label>
                    <input type="email" value={authorForm.email} onChange={e => setAuthorForm({...authorForm, email: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">签约日期</label>
                    <input type="date" value={authorForm.contractDate} onChange={e => setAuthorForm({...authorForm, contractDate: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">研究方向</label>
                    {getFields().length === 0 ? (
                      <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700">请先添加论文</div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50">
                        {getFields().map(f => (
                          <label key={f} className="flex gap-2 py-2 hover:bg-white rounded px-2 cursor-pointer transition-colors">
                            <input type="checkbox" checked={(authorForm.researchField || []).includes(f)} onChange={e => {
                              if (e.target.checked) {
                                setAuthorForm({...authorForm, researchField: [...(authorForm.researchField || []), f]});
                              } else {
                                setAuthorForm({...authorForm, researchField: (authorForm.researchField || []).filter(x => x !== f)});
                              }
                            }} className="mt-1" />
                            <span className="text-sm flex-1">{f}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {editItem && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">参与论文及作者位置</label>
                      {getAuthorPapers(editItem.name).length === 0 ? (
                        <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600">该作者暂未参与任何论文</div>
                      ) : (
                        <div className="space-y-2">
                          {getAuthorPapers(editItem.name).map((ap, idx) => (
                            <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <div className="font-medium text-slate-800">{ap.paperTitle}</div>
                                <div className="text-sm text-slate-600 mt-1">
                                  当前位置：
                                  <span className={'ml-2 px-2 py-1 rounded-full text-xs font-medium ' + 
                                    (ap.position === 'first' ? 'bg-blue-100 text-blue-800' : 
                                     ap.position === 'corresponding' ? 'bg-emerald-100 text-emerald-800' : 
                                     'bg-violet-100 text-violet-800')}>
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
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
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
                      <label className="text-sm font-medium text-slate-700">合作金额</label>
                      <button onClick={() => setAuthorForm({...authorForm, cooperationAmounts: [...(authorForm.cooperationAmounts||[]), {amount:'', date:'', project:'', position:'', note:''}]})} className="text-sm px-3 py-2 bg-amber-600 text-white rounded flex items-center gap-1 hover:bg-amber-700 transition-colors">
                        <Plus size={16} />添加
                      </button>
                    </div>
                    {(!authorForm.cooperationAmounts || authorForm.cooperationAmounts.length === 0) ? (
                      <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600">暂无记录</div>
                    ) : (
                      <div className="space-y-3">
                        {authorForm.cooperationAmounts.map((it, idx) => (
                          <div key={idx} className="bg-amber-50 p-4 rounded-xl border border-amber-300">
                            <div className="flex justify-between mb-3">
                              <span className="text-sm font-bold text-amber-900">#{idx+1}</span>
                              <button onClick={() => setAuthorForm({...authorForm, cooperationAmounts: authorForm.cooperationAmounts.filter((v,i) => i!==idx)})} className="text-red-600 hover:text-red-700"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">项目</label>
                                <select value={it.project||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], project: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                  <option value="">选择</option>
                                  {getFields().map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">位置</label>
                                <select value={it.position||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], position: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                  <option value="">选择</option>
                                  <option value="first">一作</option>
                                  <option value="corresponding">通讯</option>
                                  <option value="second">二作</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">金额</label>
                                <input type="number" value={it.amount||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], amount: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">日期</label>
                                <input type="date" value={it.date||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], date: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-700 mb-1">备注</label>
                                <input value={it.note||''} onChange={e => {
                                  const n = [...authorForm.cooperationAmounts];
                                  n[idx] = {...n[idx], note: e.target.value};
                                  setAuthorForm({...authorForm, cooperationAmounts: n});
                                }} className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-400 rounded-xl p-4 text-center">
                          <span className="text-sm font-medium text-amber-900">总金额：</span>
                          <span className="text-2xl font-bold text-amber-900 ml-2">¥{calcTotal(authorForm.cooperationAmounts).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button onClick={saveAuthor} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm">
                      <Save size={20} />{editItem ? '保存修改' : '添加作者'}
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">取消</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center rounded-t-2xl">
              <div className="text-6xl mb-2">🗑️</div>
              <h3 className="text-2xl font-bold text-white">确认删除</h3>
            </div>
            <div className="p-6">
              <p className="text-center mb-2 text-slate-600">即将删除{deleteConfirm.type === 'author' ? '作者' : '论文'}：</p>
              <p className="text-2xl font-bold text-center mb-4 text-slate-800">{deleteConfirm.name}</p>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-6 text-center text-red-700 font-bold">⚠️ 此操作无法撤销</div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">取消</button>
                <button onClick={() => {
                  if (deleteConfirm.type === 'author') {
                    setAuthors(authors.filter(a => a.id !== deleteConfirm.id));
                    addHistory('删除', '作者', `删除作者：${deleteConfirm.name}`);
                    notify('已删除');
                  } else {
                    setPapers(papers.filter(p => p.id !== deleteConfirm.id));
                    setSelectedPaper(null);
                    addHistory('删除', '论文', `删除论文：${deleteConfirm.name}`);
                    notify('已删除');
                  }
                  setDeleteConfirm(null);
                }} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm">确定删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
          <div className={`px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center gap-3 ${
            notification.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
          }`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {notification.message}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}