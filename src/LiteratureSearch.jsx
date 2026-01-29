import React, { useState, useEffect } from 'react';
import { Search, Download, CheckCircle, BookOpen, ExternalLink, Loader, AlertCircle, Home, Clock, X } from 'lucide-react';

export default function LiteratureSearch({ onBackToSystem, supabase, userId }) {
  const [searchForm, setSearchForm] = useState({ topic: '', count: 50, keep: 10 });
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // 加载历史记录（从Supabase + localStorage）
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      // 从Supabase加载
      if (supabase && userId) {
        const { data, error } = await supabase
          .from('literature_searches')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!error && data) {
          setSearchHistory(data.map(d => ({
            id: d.id,
            topic: d.topic,
            count: d.count,
            keep: d.keep,
            resultCount: d.result_count,
            timestamp: d.timestamp
          })));
          return;
        }
      }
      
      // 后备：从localStorage加载
      const saved = localStorage.getItem('literature_search_history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error);
    }
  };

  const saveSearchHistory = async (record) => {
    try {
      // 保存到Supabase
      if (supabase && userId) {
        await supabase.from('literature_searches').insert({
          id: record.id,
          user_id: userId,
          topic: record.topic,
          count: record.count,
          keep: record.keep,
          result_count: record.resultCount,
          timestamp: record.timestamp
        });
      }
      
      // 保存到localStorage（后备）
      const newHistory = [record, ...searchHistory].slice(0, 50);
      setSearchHistory(newHistory);
      localStorage.setItem('literature_search_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  };

  const notify = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const searchLiterature = async () => {
    if (!searchForm.topic.trim()) {
      notify('请输入研究主题', 'error');
      return;
    }
    
    if (searchForm.count < 1 || searchForm.count > 400) {
      notify('抓取数量应在 1-400 之间', 'error');
      return;
    }
    
    if (searchForm.keep < 1 || searchForm.keep > searchForm.count) {
      notify('保留数量不能超过抓取数量', 'error');
      return;
    }
    
    setSearching(true);
    setResults([]);
    
    try {
      notify('正在从 CrossRef 搜索文献...', 'info');
      
      const batchSize = 100;
      const batches = Math.ceil(searchForm.count / batchSize);
      let allResults = [];
      
      for (let i = 0; i < batches; i++) {
        const offset = i * batchSize;
        const rows = Math.min(batchSize, searchForm.count - offset);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const response = await fetch(
            `https://api.crossref.org/works?query=${encodeURIComponent(searchForm.topic)}&rows=${rows}&offset=${offset}&sort=relevance&order=desc&mailto=research@example.com`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`CrossRef API 请求失败 (${response.status})`);
          }
          
          const data = await response.json();
          
          if (data && data.message && Array.isArray(data.message.items)) {
            allResults = [...allResults, ...data.message.items];
          } else if (data && data.message && data.message.items) {
            allResults = [...allResults, data.message.items];
          }
          
          if (batches > 1) {
            notify(`正在抓取... ${Math.min((i + 1) * batchSize, searchForm.count)}/${searchForm.count}`, 'info');
          }
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接后重试');
          }
          throw fetchError;
        }
      }
      
      if (allResults.length > 0) {
        const literatureResults = allResults
          .filter(item => item != null)
          .map((item, idx) => {
            try {
              const authors = (Array.isArray(item.author) && item.author.length > 0)
                ? item.author.map(a => {
                    if (!a || typeof a !== 'object') return '';
                    const family = (a.family || '').trim();
                    const given = (a.given || '').trim();
                    return given ? `${family}, ${given.charAt(0)}.` : family;
                  }).filter(a => a).join(', ') || ''
                : '';
              
              const yearValue = (item.published?.['date-parts']?.[0]?.[0]) || 
                               (item.created?.['date-parts']?.[0]?.[0]) || 
                               null;
              const year = (typeof yearValue === 'number' && yearValue > 1900 && yearValue <= 2026) 
                ? yearValue 
                : null;
              
              // 如果作者或年份缺失，返回 null
              if (!authors || !year) {
                return null;
              }
              
              const journal = (Array.isArray(item['container-title']) && item['container-title'][0])
                ? item['container-title'][0]
                : (item.publisher || 'Unknown Journal');
              
              const title = (Array.isArray(item.title) && item.title[0])
                ? item.title[0]
                : (item.title || 'Untitled');
              
              const abstract = (typeof item.abstract === 'string' && item.abstract.trim())
                ? item.abstract
                : '暂无摘要';
              
              const citationCount = (typeof item['is-referenced-by-count'] === 'number') 
                ? item['is-referenced-by-count'] 
                : (parseInt(item['is-referenced-by-count']) || 0);
              const yearScore = Math.max(0, 2026 - year);
              const score = (citationCount * 0.7) + (yearScore * 0.3);
              
              return {
                id: idx + 1,
                title: String(title).trim() || 'Untitled',
                authors: String(authors).trim(),
                year: String(year),
                journal: String(journal).trim() || 'Unknown Journal',
                volume: item.volume ? String(item.volume).trim() : '',
                issue: item.issue ? String(item.issue).trim() : '',
                pages: item.page ? String(item.page).trim() : '',
                doi: item.DOI ? String(item.DOI).trim() : '',
                url: item.URL ? String(item.URL).trim() : (item.DOI ? `https://doi.org/${String(item.DOI).trim()}` : ''),
                abstract: abstract,
                type: item.type ? String(item.type).trim() : 'journal-article',
                citationCount: citationCount,
                score: isNaN(score) ? 0 : score,
                selected: false
              };
            } catch (itemError) {
              console.warn('处理文献项时出错:', itemError, item);
              return null;
            }
          })
          .filter(item => item !== null);
        
        if (literatureResults.length === 0) {
          notify('未找到包含完整作者和年份信息的文献，请尝试其他关键词', 'error');
        } else {
          const sortedResults = [...literatureResults].sort((a, b) => b.score - a.score);
          const topKeepIds = sortedResults.slice(0, searchForm.keep).map(r => r.id);
          
          literatureResults.forEach(r => {
            r.selected = topKeepIds.includes(r.id);
          });
          
          setResults(literatureResults);
          const filteredCount = allResults.length - literatureResults.length;
          const filterMsg = filteredCount > 0 ? `（已自动过滤 ${filteredCount} 篇作者或年份缺失的文献）` : '';
          notify(`成功抓取 ${literatureResults.length} 篇有效文献${filterMsg}，已智能选中前 ${Math.min(searchForm.keep, literatureResults.length)} 篇`);
          
          const historyRecord = {
            id: Date.now(),
            topic: searchForm.topic,
            count: searchForm.count,
            keep: searchForm.keep,
            resultCount: literatureResults.length,
            timestamp: new Date().toISOString()
          };
          await saveSearchHistory(historyRecord);
        }
      } else {
        notify('未找到相关文献，请尝试其他关键词', 'error');
      }
      
    } catch (error) {
      console.error('文献搜索失败:', error);
      const errorMessage = error instanceof Error ? error.message : '网络错误，请检查连接后重试';
      notify(`搜索失败: ${errorMessage}`, 'error');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelection = (id) => {
    setResults(results.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const selectAll = () => {
    setResults(results.map(r => ({ ...r, selected: true })));
  };

  const deselectAll = () => {
    setResults(results.map(r => ({ ...r, selected: false })));
  };

  const downloadWord = () => {
    try {
      const selected = results.filter(r => r && r.selected);
      if (selected.length === 0) {
        notify('请至少选择一篇文献', 'error');
        return;
      }
      
      let content = `文献综述\n${'='.repeat(100)}\n\n`;
      content += `研究主题：${searchForm.topic.trim() || '未指定'}\n`;
      content += `生成时间：${new Date().toLocaleString()}\n`;
      content += `文献数量：${selected.length} 篇（共搜索到 ${results.length} 篇）\n`;
      content += `数据来源：CrossRef API\n`;
      content += `选择策略：优先最近5年文献 + 高引用文献（评分 = 被引量×70% + 年份新近度×30%）\n\n`;
      content += `${'='.repeat(100)}\n\n参考文献（APA 第7版格式）\n\n`;
      
      selected.forEach((lit, idx) => {
        if (!lit) return;
        try {
          content += `${idx + 1}. ${lit.authors} (${lit.year}). ${lit.title}. ${lit.journal}`;
          if (lit.volume) {
            content += `, ${lit.volume}`;
            if (lit.issue) content += `(${lit.issue})`;
          }
          if (lit.pages) content += `, ${lit.pages}`;
          content += `.`;
          if (lit.doi) content += ` https://doi.org/${lit.doi}`;
          content += '\n\n';
        } catch (err) {
          console.warn('处理文献项时出错:', err);
          content += `${idx + 1}. [处理此文献时出错]\n\n`;
        }
      });
      
      content += `\n${'='.repeat(100)}\n\n文献详细信息\n\n`;
      
      selected.forEach((lit, idx) => {
        if (!lit) return;
        try {
          content += `【文献 ${idx + 1}】\n\n`;
          content += `标题：${lit.title}\n\n`;
          content += `作者：${lit.authors}\n\n`;
          content += `发表年份：${lit.year}\n\n`;
          content += `期刊：${lit.journal}\n\n`;
          if (lit.volume) content += `卷：${lit.volume}\n\n`;
          if (lit.issue) content += `期：${lit.issue}\n\n`;
          if (lit.pages) content += `页码：${lit.pages}\n\n`;
          if (lit.citationCount > 0) content += `被引用次数：${lit.citationCount}\n\n`;
          content += `综合评分：${lit.score.toFixed(2)}\n\n`;
          if (lit.doi) {
            content += `DOI：${lit.doi}\n\n`;
            content += `DOI 链接：https://doi.org/${lit.doi}\n\n`;
          }
          if (lit.url && lit.url !== `https://doi.org/${lit.doi}`) {
            content += `在线地址：${lit.url}\n\n`;
          }
          content += `文献类型：${lit.type}\n\n`;
          if (lit.abstract !== '暂无摘要') {
            content += `摘要：\n${lit.abstract}\n\n`;
          }
          content += `${'-'.repeat(100)}\n\n`;
        } catch (err) {
          console.warn('处理文献详细信息时出错:', err);
          content += `【文献 ${idx + 1}】\n\n[处理此文献详细信息时出错]\n\n${'-'.repeat(100)}\n\n`;
        }
      });
      
      content += `\n${'='.repeat(100)}\n\n使用说明\n\n`;
      content += '1. 本文档包含 APA 第7版格式的参考文献列表\n';
      content += '2. 文献按智能评分选择：被引量×70% + 年份新近度×30%\n';
      content += '3. 每篇文献包含完整的 DOI 链接，可直接访问原文\n';
      content += '4. 数据来源：CrossRef API\n';
      content += `5. 搜索主题：${searchForm.topic.trim() || '未指定'}\n`;
      content += `6. 抓取设置：共 ${searchForm.count} 篇，保留 ${selected.length} 篇\n`;
      content += `7. 所有文献均包含完整的作者和年份信息\n\n`;
      
      const blob = new Blob(['\ufeff' + content], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTopic = ((searchForm.topic || '').replace(/[^\w\s\u4e00-\u9fa5]/gi, '') || '文献').substring(0, 30);
      link.download = `文献综述_${safeTopic}_${selected.length}篇_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      notify(`已导出 ${selected.length} 篇文献到 Word 文档`);
    } catch (error) {
      console.error('导出Word文档时出错:', error);
      notify('导出失败：' + (error.message || '未知错误'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <BookOpen size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">文献抓取工具</h1>
                <p className="text-sm text-slate-500">基于 CrossRef API 的学术文献搜索与导出</p>
              </div>
            </div>
            <div className="flex gap-2">
              {searchHistory.length > 0 && (
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors shadow-sm"
                >
                  <Clock size={18} />
                  搜索历史 ({searchHistory.length})
                </button>
              )}
              {onBackToSystem && (
                <button 
                  onClick={onBackToSystem}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shadow-sm"
                >
                  <Home size={18} />
                  返回主系统
                </button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">🔍 研究主题 *</label>
              <input
                type="text"
                value={searchForm.topic}
                onChange={e => setSearchForm({ ...searchForm, topic: e.target.value })}
                placeholder="例如：machine learning、心理健康、COVID-19 treatment"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                onKeyPress={e => e.key === 'Enter' && searchLiterature()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">📊 抓取数量</label>
              <input
                type="number"
                min="1"
                max="400"
                value={searchForm.count}
                onChange={e => setSearchForm({ ...searchForm, count: parseInt(e.target.value) || 50 })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">范围：1-400 篇</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">✅ 保留数量</label>
              <input
                type="number"
                min="1"
                max={searchForm.count}
                value={searchForm.keep}
                onChange={e => setSearchForm({ ...searchForm, keep: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">智能选中前 N 篇</p>
            </div>
            
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={searchLiterature}
                disabled={searching}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg disabled:opacity-50 font-medium text-lg"
              >
                {searching ? (
                  <>
                    <Loader size={24} className="animate-spin" />
                    <span>正在搜索...</span>
                  </>
                ) : (
                  <>
                    <Search size={24} />
                    <span>开始搜索文献</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {showHistory && searchHistory.length > 0 && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-purple-900">搜索历史记录</h3>
                <button onClick={() => setShowHistory(false)} className="text-purple-600 hover:text-purple-800">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchHistory.map((record) => (
                  <div key={record.id} className="bg-white rounded-lg p-3 flex justify-between items-center text-sm border border-purple-100">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 mb-1">{record.topic}</div>
                      <div className="text-xs text-slate-500">
                        🕒 {new Date(record.timestamp).toLocaleString()} | 📊 抓取 {record.count} 篇 | ✅ 保留 {record.keep} 篇 | 📈 结果 {record.resultCount} 篇
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSearchForm({ topic: record.topic, count: record.count, keep: record.keep });
                        setShowHistory(false);
                      }}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-medium transition-colors"
                    >
                      重新搜索
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6 flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
              <div className="flex gap-6 text-sm">
                <span className="text-slate-700">
                  共找到 <span className="font-bold text-indigo-600 text-lg">{results.length}</span> 篇
                </span>
                <span className="text-slate-700">
                  已选中 <span className="font-bold text-emerald-600 text-lg">{results.filter(r => r.selected).length}</span> 篇
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm border border-slate-200 transition-colors font-medium">
                  全选
                </button>
                <button onClick={deselectAll} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm border border-slate-200 transition-colors font-medium">
                  全不选
                </button>
                <button
                  onClick={downloadWord}
                  disabled={results.filter(r => r.selected).length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg transition-colors disabled:opacity-50 shadow-lg font-medium"
                >
                  <Download size={18} />
                  导出 Word
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 智能筛选：自动过滤缺失作者或年份的文献 | 优先选择最近5年 + 高引用文献 | 评分算法：被引量×70% + 年份新近度×30%
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {results.map((lit) => (
            <div
              key={lit.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all p-6 ${
                lit.selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <button
                    onClick={() => toggleSelection(lit.id)}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                      lit.selected
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lit.selected ? <CheckCircle size={28} /> : lit.id}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{lit.title}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      📅 {lit.year}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      📑 {lit.type}
                    </span>
                    {lit.citationCount > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        📊 被引 {lit.citationCount} 次
                      </span>
                    )}
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                      ⭐ 评分 {lit.score.toFixed(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-slate-700 mb-3">
                    <div><span className="font-medium">作者：</span>{lit.authors}</div>
                    <div><span className="font-medium">期刊：</span>{lit.journal}</div>
                    {(lit.volume || lit.issue || lit.pages) && (
                      <div>
                        <span className="font-medium">卷期页：</span>
                        {lit.volume && `Vol. ${lit.volume}`}
                        {lit.issue && ` (${lit.issue})`}
                        {lit.pages && `, pp. ${lit.pages}`}
                      </div>
                    )}
                    {lit.doi && (
                      <div>
                        <span className="font-medium">DOI：</span>
                        <a
                          href={`https://doi.org/${lit.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {lit.doi} <ExternalLink size={12} className="inline" />
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">APA 格式：</div>
                    <div className="text-sm text-slate-700">
                      {lit.authors} ({lit.year}). {lit.title}. <em>{lit.journal}</em>
                      {lit.volume && `, ${lit.volume}`}
                      {lit.issue && `(${lit.issue})`}
                      {lit.pages && `, ${lit.pages}`}.
                      {lit.doi && ` https://doi.org/${lit.doi}`}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => toggleSelection(lit.id)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      lit.selected ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    }`}
                  >
                    {lit.selected ? '取消' : '选择'}
                  </button>
                  {lit.doi && (
                    <a
                      href={`https://doi.org/${lit.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-center font-medium"
                    >
                      原文
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {results.length === 0 && !searching && (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">开始搜索学术文献</h3>
              <p className="text-slate-500 mb-2">输入研究主题，设置抓取和保留数量</p>
              <p className="text-xs text-slate-400">智能筛选：自动过滤缺失作者或年份的文献，优先选择最近5年 + 高引用文献</p>
            </div>
          )}
          
          {searching && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Loader size={48} className="animate-spin text-indigo-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">正在搜索...</h3>
              <p className="text-slate-500">正在从 CrossRef 检索文献</p>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center gap-3 ${
            notification.type === 'error' ? 'bg-red-600' : 
            notification.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
          }`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}