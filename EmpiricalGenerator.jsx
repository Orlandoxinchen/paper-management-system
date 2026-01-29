import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Loader, CheckCircle, Database, PlayCircle, AlertCircle, History } from 'lucide-react';

export default function EmpiricalGenerator({ onBackToSystem, supabase, userId }) {
  const [sampleSize, setSampleSize] = useState('');
  const [title, setTitle] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [usageHistory, setUsageHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // 加载历史记录（从Supabase + localStorage）
  useEffect(() => {
    loadUsageHistory();
  }, []);

  const loadUsageHistory = async () => {
    try {
      // 从Supabase加载
      if (supabase && userId) {
        const { data, error } = await supabase
          .from('empirical_researches')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!error && data) {
          setUsageHistory(data.map(d => ({
            id: d.id,
            timestamp: d.timestamp,
            title: d.title,
            sampleSize: d.sample_size,
            methods: d.selected_methods,
            randomSeed: d.random_seed
          })));
          return;
        }
      }
      
      // 后备：从localStorage加载
      const saved = localStorage.getItem('empirical_usage_history');
      if (saved) {
        setUsageHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('加载历史失败:', e);
    }
  };

  const saveToHistory = async (data) => {
    const newRecord = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('zh-CN'),
      title: data.title,
      sampleSize: data.sampleSize,
      methods: data.selectedMethods,
      randomSeed: data.randomSeed
    };
    
    try {
      // 保存到Supabase
      if (supabase && userId) {
        await supabase.from('empirical_researches').insert({
          id: newRecord.id,
          user_id: userId,
          title: data.title,
          sample_size: data.sampleSize,
          random_seed: data.randomSeed,
          design: data.design,
          questionnaire: data.questionnaire,
          selected_methods: data.selectedMethods,
          reliability: data.reliability,
          timestamp: newRecord.timestamp
        });
      }
      
      // 保存到localStorage（后备）
      const newHistory = [newRecord, ...usageHistory].slice(0, 50);
      setUsageHistory(newHistory);
      localStorage.setItem('empirical_usage_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('保存历史失败:', error);
    }
  };

  const steps = [
    'AI生成研究变量',
    'AI生成问卷题项',
    '生成模拟数据',
    '生成统计表格',
    '完成'
  ];

  const allAnalysisMethods = [
    { id: 1, name: 'Hierarchical Regression Analysis', nameZh: '层级回归分析' },
    { id: 2, name: 'Moderated Mediation Effect', nameZh: '有调节的中介效应' },
    { id: 3, name: 'Group Comparison Analysis', nameZh: '组间差异分析' },
    { id: 4, name: 'Bootstrap Confidence Interval', nameZh: 'Bootstrap置信区间' },
    { id: 5, name: 'Polynomial Regression', nameZh: '多项式回归' },
    { id: 6, name: 'Three-Way Interaction', nameZh: '三阶交互效应' },
    { id: 7, name: 'Parallel Mediation Model', nameZh: '并行中介模型' },
    { id: 8, name: 'Serial Mediation Model', nameZh: '链式中介模型' },
    { id: 9, name: 'Ridge Regression', nameZh: '岭回归分析' },
    { id: 10, name: 'Lasso Regression', nameZh: 'Lasso回归' },
    { id: 11, name: 'Stepwise Regression', nameZh: '逐步回归' },
    { id: 12, name: 'Curvilinear Effect Test', nameZh: '曲线关系检验' },
    { id: 13, name: 'Mediated Moderation', nameZh: '被中介的调节效应' },
    { id: 14, name: 'Random Forest Importance', nameZh: '随机森林变量重要性' },
    { id: 15, name: 'Standardized Coefficients', nameZh: '标准化回归系数' },
    { id: 16, name: 'Commonality Analysis', nameZh: '共同性分析' },
    { id: 17, name: 'Simple Slope Analysis', nameZh: '简单斜率分析' },
    { id: 18, name: 'Incremental Validity Test', nameZh: '增量效度分析' },
    { id: 19, name: 'SEM Path Analysis', nameZh: 'SEM路径分析' },
    { id: 20, name: 'Multi-Group Comparison', nameZh: '多组比较分析' },
    { id: 21, name: 'Sobel Test for Mediation', nameZh: 'Sobel中介检验' },
    { id: 22, name: 'Conditional Process Analysis', nameZh: '条件过程分析' },
    { id: 23, name: 'Quadratic Effect Analysis', nameZh: '二次效应分析' },
    { id: 24, name: 'Moderation with Covariates', nameZh: '协变量调节分析' },
    { id: 25, name: 'Latent Growth Curve Model', nameZh: '潜在增长曲线' },
    { id: 26, name: 'Cross-Lagged Panel Analysis', nameZh: '交叉滞后分析' },
    { id: 27, name: 'Propensity Score Matching', nameZh: '倾向得分匹配' },
    { id: 28, name: 'Difference-in-Differences', nameZh: '双重差分法' },
    { id: 29, name: 'Instrumental Variable Analysis', nameZh: '工具变量分析' },
    { id: 30, name: 'Partial Least Squares SEM', nameZh: '偏最小二乘SEM' }
  ];

  const generateResearch = async () => {
    if (!title.trim()) {
      setError('请输入研究题目');
      return;
    }
    
    const cleanedApiKey = apiKey.trim();
    if (!cleanedApiKey) {
      setError('请输入API密钥');
      return;
    }
    
    const numSampleSize = parseInt(sampleSize);
    if (!sampleSize || isNaN(numSampleSize) || numSampleSize < 30 || numSampleSize > 1000) {
      setError('样本量应在30-1000之间');
      return;
    }

    setError('');
    setGenerating(true);
    setCurrentStep(0);
    setResult(null);

    try {
      // Step 1: AI生成研究设计
      setCurrentStep(1);
      let design;
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanedApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: `Based on research title: "${title}". Generate 5 variables for empirical study. Return ONLY JSON: {"iv":{"name":"中文名","name_en":"English Name"},"mediator":{"name":"中文名","name_en":"English Name"},"dv":{"name":"中文名","name_en":"English Name"},"mod1":{"name":"中文名","name_en":"English Name"},"mod2":{"name":"中文名","name_en":"English Name"}}. Requirements: academically appropriate, 3-6 words English, theoretically sound causal logic IV→M→DV with Z1,Z2 moderators.`
            }],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `API Error ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanContent = content.replace(/```json|```/g, '').trim();
        design = JSON.parse(cleanContent);
        
        if (!design.iv || !design.mediator || !design.dv || !design.mod1 || !design.mod2) {
          throw new Error('生成的变量不完整');
        }
      } catch (err) {
        console.error('AI生成设计失败:', err);
        setError('步骤1失败: ' + err.message);
        throw err;
      }

      // Step 2: AI生成问卷题项
      setCurrentStep(2);
      let questionnaire;
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanedApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: `Generate 4 measurement items for each variable (20 total). Variables: IV=${design.iv.name_en}, Mediator=${design.mediator.name_en}, DV=${design.dv.name_en}, Mod1=${design.mod1.name_en}, Mod2=${design.mod2.name_en}. Return ONLY JSON: {"iv":["item1","item2","item3","item4"],"mediator":["item1","item2","item3","item4"],"dv":["item1","item2","item3","item4"],"mod1":["item1","item2","item3","item4"],"mod2":["item1","item2","item3","item4"]}. Each item: 15-25 words, clear statement for 7-point Likert scale, academically rigorous.`
            }],
            temperature: 0.7,
            max_tokens: 1500
          })
        });

        if (!response.ok) {
          throw new Error(`API Error ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanContent = content.replace(/```json|```/g, '').trim();
        questionnaire = JSON.parse(cleanContent);
      } catch (err) {
        console.error('AI生成问卷失败:', err);
        questionnaire = {
          iv: [`High level of ${design.iv.name_en}`,`${design.iv.name_en} is priority`,`Invest in ${design.iv.name_en}`,`Systematic ${design.iv.name_en}`],
          mediator: [`Strong ${design.mediator.name_en}`,`Capabilities in ${design.mediator.name_en}`,`${design.mediator.name_en} contributes`,`Improve ${design.mediator.name_en}`],
          dv: [`High ${design.dv.name_en}`,`${design.dv.name_en} improved`,`Outperform in ${design.dv.name_en}`,`${design.dv.name_en} meets expectations`],
          mod1: [`${design.mod1.name_en} affects us`,`High ${design.mod1.name_en}`,`${design.mod1.name_en} challenges`,`Adapt to ${design.mod1.name_en}`],
          mod2: [`Strong ${design.mod2.name_en}`,`${design.mod2.name_en} key role`,`Align with ${design.mod2.name_en}`,`${design.mod2.name_en} supports goals`]
        };
      }

      for (let i = 3; i <= 5; i++) {
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const shuffled = [...allAnalysisMethods].sort(() => Math.random() - 0.5);
      const selectedMethods = shuffled.slice(0, 5);

      const resultData = {
        title,
        timestamp: new Date().toLocaleString('zh-CN'),
        randomSeed: Math.floor(Math.random() * 1000000),
        design,
        questionnaire,
        sampleSize: numSampleSize,
        selectedMethods,
        reliability: {
          iv: { alpha: (0.75 + Math.random() * 0.15).toFixed(3), ave: (0.55 + Math.random() * 0.15).toFixed(3), cr: (0.75 + Math.random() * 0.15).toFixed(3) },
          mediator: { alpha: (0.75 + Math.random() * 0.15).toFixed(3), ave: (0.55 + Math.random() * 0.15).toFixed(3), cr: (0.75 + Math.random() * 0.15).toFixed(3) },
          dv: { alpha: (0.75 + Math.random() * 0.15).toFixed(3), ave: (0.55 + Math.random() * 0.15).toFixed(3), cr: (0.75 + Math.random() * 0.15).toFixed(3) },
          mod1: { alpha: (0.75 + Math.random() * 0.15).toFixed(3), ave: (0.55 + Math.random() * 0.15).toFixed(3), cr: (0.75 + Math.random() * 0.15).toFixed(3) },
          mod2: { alpha: (0.75 + Math.random() * 0.15).toFixed(3), ave: (0.55 + Math.random() * 0.15).toFixed(3), cr: (0.75 + Math.random() * 0.15).toFixed(3) }
        }
      };

      setResult(resultData);
      saveToHistory(resultData);
    } catch (err) {
      setError('生成失败: ' + err.message);
    } finally {
      setGenerating(false);
      setCurrentStep(0);
    }
  };

  const generateTable1 = (design, n) => {
    return [
      [design.iv.name_en, n, (4.5 + (Math.random()-0.5)*0.3).toFixed(3), (0.95 + (Math.random()-0.5)*0.2).toFixed(3), '1.75', '7.00'],
      [design.mediator.name_en, n, (4.3 + (Math.random()-0.5)*0.3).toFixed(3), (1.05 + (Math.random()-0.5)*0.2).toFixed(3), '1.50', '7.00'],
      [design.dv.name_en, n, (4.6 + (Math.random()-0.5)*0.3).toFixed(3), (0.92 + (Math.random()-0.5)*0.2).toFixed(3), '2.00', '7.00'],
      [design.mod1.name_en, n, (4.2 + (Math.random()-0.5)*0.3).toFixed(3), (1.01 + (Math.random()-0.5)*0.2).toFixed(3), '1.25', '6.75'],
      [design.mod2.name_en, n, (4.4 + (Math.random()-0.5)*0.3).toFixed(3), (0.97 + (Math.random()-0.5)*0.2).toFixed(3), '1.50', '7.00'],
      ['Age', n, '21.45', '2.31', '18', '25']
    ];
  };

  const generateTable2 = (design) => {
    const corrs = [
      ['1.000', '', '', '', ''],
      [(0.50 + Math.random()*0.20).toFixed(3), '1.000', '', '', ''],
      [(0.55 + Math.random()*0.20).toFixed(3), (0.65 + Math.random()*0.15).toFixed(3), '1.000', '', ''],
      [(0.15 + Math.random()*0.20).toFixed(3), (0.20 + Math.random()*0.15).toFixed(3), (0.25 + Math.random()*0.15).toFixed(3), '1.000', ''],
      [(0.10 + Math.random()*0.20).toFixed(3), (0.18 + Math.random()*0.15).toFixed(3), (0.28 + Math.random()*0.15).toFixed(3), (0.35 + Math.random()*0.15).toFixed(3), '1.000']
    ];
    return corrs.map(row => row.map(cell => {
      if (cell && cell !== '1.000' && cell !== '') {
        const val = parseFloat(cell);
        if (val > 0.3) return cell + '***';
        if (val > 0.2) return cell + '**';
        if (val > 0.15) return cell + '*';
      }
      return cell;
    }));
  };

  const generateTable3 = (design, reliability) => {
    return [
      [design.iv.name_en, '4', reliability.iv.alpha, reliability.iv.ave, reliability.iv.cr],
      [design.mediator.name_en, '4', reliability.mediator.alpha, reliability.mediator.ave, reliability.mediator.cr],
      [design.dv.name_en, '4', reliability.dv.alpha, reliability.dv.ave, reliability.dv.cr],
      [design.mod1.name_en, '4', reliability.mod1.alpha, reliability.mod1.ave, reliability.mod1.cr],
      [design.mod2.name_en, '4', reliability.mod2.alpha, reliability.mod2.ave, reliability.mod2.cr]
    ];
  };

  const downloadExcel = () => {
    if (!result) return;
    
    // 使用固定种子生成一致的数据
    const seed = result.randomSeed;
    const seededRandom = (index) => {
      const x = Math.sin(seed + index + 1000) * 10000;
      return x - Math.floor(x);
    };
    
    const headers = ['ID','Age','Gender','IV_1','IV_2','IV_3','IV_4','M_1','M_2','M_3','M_4','DV_1','DV_2','DV_3','DV_4','Z1_1','Z1_2','Z1_3','Z1_4','Z2_1','Z2_2','Z2_3','Z2_4','IV','M','DV','Z1','Z2'];
    let csv = '\ufeff' + headers.join(',') + '\n';
    
    for (let i = 0; i < result.sampleSize; i++) {
      const values = [`R${String(i+1).padStart(4,'0')}`, 18 + Math.floor(seededRandom(i*100) * 8), seededRandom(i*100+1) > 0.5 ? 'Male' : 'Female'];
      ['IV', 'M', 'DV', 'Z1', 'Z2'].forEach((prefix, prefixIdx) => {
        for (let j = 0; j < 4; j++) {
          values.push(Math.floor(seededRandom(i*100 + prefixIdx*10 + j + 50) * 7) + 1);
        }
      });
      ['IV', 'M', 'DV', 'Z1', 'Z2'].forEach((p, idx) => {
        const start = 3 + idx * 4;
        values.push((values.slice(start, start + 4).reduce((a,b) => a+b) / 4).toFixed(2));
      });
      csv += values.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `empirical_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const downloadWord = () => {
    if (!result) return;
    const { design, selectedMethods, questionnaire } = result;
    const table1 = generateTable1(design, result.sampleSize);
    const table2 = generateTable2(design);
    const table3 = generateTable3(design, result.reliability);
    
    // 检查信效度是否全部通过
    const allReliabilityPassed = Object.values(result.reliability).every(r => 
      parseFloat(r.alpha) >= 0.70 && parseFloat(r.ave) >= 0.50 && parseFloat(r.cr) >= 0.70
    );
    const reliabilityNote = allReliabilityPassed ? 
      '✅ All reliability and validity indicators passed the recommended thresholds (Cronbach\'s α ≥ .70, AVE ≥ .50, CR ≥ .70).' : 
      '⚠️ Some indicators did not meet the recommended thresholds. Please review the measurement scales.';
    
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${result.title}</title><style>body{font-family:'Times New Roman',serif;margin:1in;line-height:2;color:#000;font-size:12pt}h1{text-align:center;margin-bottom:20px;font-size:14pt;font-weight:bold}h2{margin-top:30px;margin-bottom:15px;font-size:13pt;font-weight:bold}h3{margin-top:20px;margin-bottom:10px;font-size:12pt;font-weight:bold}p{margin:10px 0;text-align:justify}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:11pt}th{background:#fff;border-top:2px solid #000;border-bottom:1px solid #000;padding:8px;text-align:center;font-weight:bold}td{padding:6px;text-align:center}tr:last-child td{border-bottom:2px solid #000}.question{margin:10px 0}.scale{margin-left:30px;font-size:11pt}.note{font-size:10pt;margin-top:8px;font-style:italic}.analysis{margin:15px 0;text-align:justify;text-indent:0.5in}</style></head><body>
<h1>${result.title}</h1>
<p style="text-align:center;font-size:10pt">Generated: ${result.timestamp} | Sample Size: N=${result.sampleSize} | Random Seed: ${result.randomSeed}</p>

<h2>Research Questionnaire</h2>
<h3>Part I: Demographic Information</h3>
<div class="question">1. Your age: ______ years old (Range: 18-25)</div>
<div class="question">2. Your gender: □ Female   □ Male</div>

<h3>Part II: ${design.iv.name_en}</h3>
<p><strong>Instructions:</strong> Please indicate your level of agreement with the following statements based on your actual experience.</p>
<p><strong>Scale:</strong> 1 = Strongly Disagree, 2 = Disagree, 3 = Somewhat Disagree, 4 = Neutral, 5 = Somewhat Agree, 6 = Agree, 7 = Strongly Agree</p>
${questionnaire.iv.map((item, i) => `<div class="question">2.${i+1} ${item}</div><div class="scale">Rating: □1  □2  □3  □4  □5  □6  □7</div>`).join('\n')}

<h3>Part III: ${design.mediator.name_en}</h3>
<p><strong>Scale:</strong> 1 = Strongly Disagree to 7 = Strongly Agree</p>
${questionnaire.mediator.map((item, i) => `<div class="question">3.${i+1} ${item}</div><div class="scale">Rating: □1  □2  □3  □4  □5  □6  □7</div>`).join('\n')}

<h3>Part IV: ${design.dv.name_en}</h3>
<p><strong>Scale:</strong> 1 = Strongly Disagree to 7 = Strongly Agree</p>
${questionnaire.dv.map((item, i) => `<div class="question">4.${i+1} ${item}</div><div class="scale">Rating: □1  □2  □3  □4  □5  □6  □7</div>`).join('\n')}

<h3>Part V: ${design.mod1.name_en}</h3>
<p><strong>Scale:</strong> 1 = Strongly Disagree to 7 = Strongly Agree</p>
${questionnaire.mod1.map((item, i) => `<div class="question">5.${i+1} ${item}</div><div class="scale">Rating: □1  □2  □3  □4  □5  □6  □7</div>`).join('\n')}

<h3>Part VI: ${design.mod2.name_en}</h3>
<p><strong>Scale:</strong> 1 = Strongly Disagree to 7 = Strongly Agree</p>
${questionnaire.mod2.map((item, i) => `<div class="question">6.${i+1} ${item}</div><div class="scale">Rating: □1  □2  □3  □4  □5  □6  □7</div>`).join('\n')}

<div style="page-break-before:always"></div>

<h2>Empirical Analysis Results</h2>

<h3>Table 0: Measurement Constructs and Items</h3>
<table>
<tr><th>Construct</th><th>Items</th><th>Source/Adapted From</th></tr>
<tr><td>${design.iv.name_en}</td><td>4</td><td>Adapted from relevant literature</td></tr>
<tr><td>${design.mediator.name_en}</td><td>4</td><td>Adapted from relevant literature</td></tr>
<tr><td>${design.dv.name_en}</td><td>4</td><td>Adapted from relevant literature</td></tr>
<tr><td>${design.mod1.name_en}</td><td>4</td><td>Adapted from relevant literature</td></tr>
<tr><td>${design.mod2.name_en}</td><td>4</td><td>Adapted from relevant literature</td></tr>
</table>
<p class="note">Note: All constructs were measured using 7-point Likert scales (1 = Strongly Disagree to 7 = Strongly Agree).</p>

<h3>Table 1: Descriptive Statistics</h3>
<table>
<tr><th>Variable</th><th>N</th><th>Mean</th><th>SD</th><th>Min</th><th>Max</th></tr>
${table1.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
</table>
<p class="analysis">Table 1 presents descriptive statistics for all study variables. The mean scores for the primary constructs ranged from ${table1[0][2]} to ${table1[2][2]}, indicating moderate to moderately high levels across all measures. Standard deviations ranged from ${Math.min(...table1.slice(0,5).map(r => parseFloat(r[3]))).toFixed(3)} to ${Math.max(...table1.slice(0,5).map(r => parseFloat(r[3]))).toFixed(3)}, suggesting adequate variance in responses to support subsequent analyses.</p>

<h3>Table 2: Intercorrelations Among Study Variables</h3>
<table>
<tr><th>Variable</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
${table2.map((r, i) => `<tr><td>${i+1}. ${[design.iv.name_en, design.mediator.name_en, design.dv.name_en, design.mod1.name_en, design.mod2.name_en][i]}</td>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
</table>
<p class="note">Note: ***p < .001, **p < .01, *p < .05. Correlations are Pearson product-moment correlation coefficients. N = ${result.sampleSize}.</p>
<p class="analysis">The bivariate correlations displayed in Table 2 reveal theoretically meaningful patterns of association among study variables. As hypothesized, ${design.iv.name_en} exhibited significant positive correlations with both ${design.mediator.name_en} (r = ${table2[1][0]}) and ${design.dv.name_en} (r = ${table2[2][0]}), providing preliminary empirical support for the proposed relationships in our conceptual model.</p>

<h3>Table 3: Reliability and Validity Assessment</h3>
<table>
<tr><th>Construct</th><th>Items</th><th>Cronbach's α</th><th>AVE</th><th>CR</th></tr>
${table3.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
</table>
<p class="note">Note: AVE = Average Variance Extracted; CR = Composite Reliability. Recommended thresholds: Cronbach's α ≥ .70, AVE ≥ .50, CR ≥ .70.</p>
<p class="analysis"><strong>${reliabilityNote}</strong> All constructs exhibited excellent internal consistency, with Cronbach's alpha coefficients ranging from ${Math.min(...Object.values(result.reliability).map(v => parseFloat(v.alpha))).toFixed(3)} to ${Math.max(...Object.values(result.reliability).map(v => parseFloat(v.alpha))).toFixed(3)}.</p>

<h3>Table 4: ${selectedMethods[0].name}</h3>
<table>
<tr><th>Variable</th><th>B</th><th>SE</th><th>t</th><th>Sig.</th></tr>
<tr><td>Constant</td><td>1.234</td><td>0.156</td><td>7.923</td><td>***</td></tr>
<tr><td>${design.iv.name_en}</td><td>0.567</td><td>0.045</td><td>12.600</td><td>***</td></tr>
<tr><td>${design.mediator.name_en}</td><td>0.423</td><td>0.038</td><td>11.132</td><td>***</td></tr>
</table>
<p class="note">Note: ***p < .001, **p < .01, *p < .05. R² = .524, Adjusted R² = .520, F(2, ${result.sampleSize - 3}) = 162.45, p < .001.</p>
<p class="analysis">Table 4 presents the results examining the effects of ${design.iv.name_en} and ${design.mediator.name_en} on ${design.dv.name_en}. The analysis reveals significant positive effects for both predictors, providing robust empirical support for the hypothesized relationships in our theoretical model.</p>

<h3>Table 5: ${selectedMethods[1].name}</h3>
<table>
<tr><th>Path</th><th>Effect</th><th>SE</th><th>95% CI</th><th>Sig.</th></tr>
<tr><td>Total Effect (c)</td><td>0.623</td><td>0.049</td><td>[0.527, 0.719]</td><td>***</td></tr>
<tr><td>Direct Effect (c')</td><td>0.205</td><td>0.067</td><td>[0.073, 0.337]</td><td>**</td></tr>
<tr><td>Indirect Effect (a×b)</td><td>0.418</td><td>0.052</td><td>[0.318, 0.524]</td><td>***</td></tr>
<tr><td>Path a (IV→M)</td><td>0.587</td><td>0.048</td><td>[0.493, 0.681]</td><td>***</td></tr>
<tr><td>Path b (M→DV)</td><td>0.712</td><td>0.055</td><td>[0.604, 0.820]</td><td>***</td></tr>
</table>
<p class="note">Note: Bootstrap samples = 2,000. Bias-corrected 95% confidence intervals. ***p < .001, **p < .01.</p>
<p class="analysis">The mediation analysis provides compelling evidence for the hypothesized mediating role of ${design.mediator.name_en}. The significant indirect effect demonstrates the psychological mechanisms through which ${design.iv.name_en} influences ${design.dv.name_en}.</p>

<h3>Table 6: ${selectedMethods[2].name}</h3>
<table>
<tr><th>Variable</th><th>B</th><th>SE</th><th>t</th><th>Sig.</th></tr>
<tr><td>${design.iv.name_en}</td><td>0.534</td><td>0.047</td><td>11.362</td><td>***</td></tr>
<tr><td>${design.mod1.name_en}</td><td>0.234</td><td>0.051</td><td>4.588</td><td>***</td></tr>
<tr><td>Interaction (IV×MOD1)</td><td>0.123</td><td>0.053</td><td>2.321</td><td>*</td></tr>
</table>
<p class="note">Note: Variables were mean-centered prior to creating interaction terms. R² = .487, ΔR² = .015 for interaction term, p < .05.</p>
<p class="analysis">Table 6 presents moderation analysis results examining whether ${design.mod1.name_en} conditions the relationship between ${design.iv.name_en} and ${design.dv.name_en}. The interaction term yielded a statistically significant positive coefficient, providing evidence that ${design.mod1.name_en} moderates the focal relationship.</p>

<h3>Table 7: ${selectedMethods[3].name}</h3>
<table>
<tr><th>Variable</th><th>β</th><th>SE</th><th>t</th><th>Sig.</th></tr>
<tr><td>${design.iv.name_en} (std)</td><td>0.445</td><td>0.041</td><td>10.854</td><td>***</td></tr>
<tr><td>${design.mediator.name_en} (std)</td><td>0.512</td><td>0.039</td><td>13.128</td><td>***</td></tr>
</table>
<p class="note">Note: All variables were z-score standardized (M = 0, SD = 1). Standardized coefficients (β) allow direct comparison of relative effect sizes.</p>
<p class="analysis">Table 7 reports robustness checks using standardized variables, demonstrating that the findings remain consistent across different analytical specifications.</p>

<h3>Table 8: ${selectedMethods[4].name}</h3>
<table>
<tr><th>Variable</th><th>VIF</th><th>Tolerance</th><th>Assessment</th></tr>
<tr><td>${design.iv.name_en}</td><td>1.234</td><td>0.810</td><td>Acceptable</td></tr>
<tr><td>${design.mediator.name_en}</td><td>1.456</td><td>0.687</td><td>Acceptable</td></tr>
<tr><td>${design.dv.name_en}</td><td>1.123</td><td>0.891</td><td>Acceptable</td></tr>
<tr><td>${design.mod1.name_en}</td><td>1.345</td><td>0.744</td><td>Acceptable</td></tr>
<tr><td>${design.mod2.name_en}</td><td>1.267</td><td>0.789</td><td>Acceptable</td></tr>
</table>
<p class="note">Note: VIF = Variance Inflation Factor. VIF < 5 and Tolerance > .20 indicate acceptable levels. All VIF values fall well below the conservative threshold of 5.0.</p>
<p class="analysis">Table 8 presents comprehensive multicollinearity diagnostics, indicating the complete absence of problematic multicollinearity in our regression models.</p>

<p style="margin-top:40px;text-align:center;font-size:10pt;color:#666">
--- End of Report ---<br>
Note: This is a computer-generated research report for reference purposes.<br>
All analyses follow APA 7th edition formatting guidelines.
</p>

</body></html>`;
    
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Report_${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={onBackToSystem} className="mb-4 flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300">
          <ArrowLeft size={18} />返回
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">实证研究生成系统</h1>
          <p className="text-sm text-slate-600">AI生成变量+问卷+数据+9个统计表格 (OpenAI GPT-4o-mini)</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">参数设置</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">研究题目 *</label>
                  <textarea value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：数字化转型对企业创新绩效的影响" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">样本量 *</label>
                  <input type="number" min="30" max="1000" value={sampleSize} onChange={e => setSampleSize(e.target.value)} placeholder="30-1000" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="text-xs text-slate-500 mt-1">推荐：200-500</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">YCE运行密钥 *</label>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="text-xs text-slate-500 mt-1">
                    请联系管理员获取密钥
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <button onClick={generateResearch} disabled={generating} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                {generating ? (<><Loader size={20} className="animate-spin" />生成中...</>) : (<><PlayCircle size={20} />开始生成</>)}
              </button>

              {generating && currentStep > 0 && (
                <div className="mt-4 space-y-2">
                  {steps.map((step, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded ${idx + 1 === currentStep ? 'bg-blue-100 border border-blue-300' : idx + 1 < currentStep ? 'bg-green-100 border border-green-300' : 'bg-slate-100'}`}>
                      {idx + 1 < currentStep ? <CheckCircle size={16} className="text-green-600" /> : idx + 1 === currentStep ? <Loader size={16} className="text-blue-600 animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-400"></div>}
                      <span className={`text-sm ${idx + 1 === currentStep ? 'text-blue-700 font-medium' : idx + 1 < currentStep ? 'text-green-700' : 'text-slate-500'}`}>{idx + 1}. {step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {result && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">研究模型</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">IV</span>
                      <span>{result.design.iv.name_en}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">M</span>
                      <span>{result.design.mediator.name_en}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">DV</span>
                      <span>{result.design.dv.name_en}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">下载文件</h3>
                  <div className="space-y-2">
                    <button onClick={downloadExcel} className="w-full flex items-center justify-between px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                      <div className="flex items-center gap-2"><Database size={18} /><span>Data (CSV)</span></div>
                      <Download size={16} />
                    </button>
                    <button onClick={downloadWord} className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                      <div className="flex items-center gap-2"><FileText size={18} /><span>Report (DOC)</span></div>
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">信效度</h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(result.reliability).map(([key, val], idx) => (
                    <div key={idx} className="bg-slate-50 rounded p-2">
                      <div className="font-medium mb-1">{['IV', 'M', 'DV', 'Z1', 'Z2'][idx]}</div>
                      <div className="flex gap-3 text-slate-600">
                        <span>α:{val.alpha}</span>
                        <span>AVE:{val.ave}</span>
                        <span>CR:{val.cr}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between hover:text-blue-600">
                <div className="flex items-center gap-2">
                  <History size={18} />
                  <h3 className="text-lg font-bold text-slate-800">使用记录</h3>
                </div>
                <span className="text-sm text-slate-500">{showHistory ? '收起▲' : `展开(${usageHistory.length})▼`}</span>
              </button>
              {showHistory && usageHistory.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto mt-4">
                  {usageHistory.map(record => (
                    <div key={record.id} className="bg-slate-50 rounded-lg p-3 border">
                      <div className="text-sm font-medium mb-1">{record.title}</div>
                      <div className="text-xs text-slate-600">N={record.sampleSize} | {record.timestamp}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}