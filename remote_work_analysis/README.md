# 远程办公数据 — 表格与图表重跑脚本 (Remote Work Analysis)

用于从 **远程办公数据.xlsx** 重算论文中的 Table 2～Table 8 以及 3 张黑白图，便于复现与分享。

## 环境

- Python 3.8+
- 依赖：`pandas`, `numpy`, `scipy`, `statsmodels`, `matplotlib`, `openpyxl`, `factor_analyzer`

```bash
pip install pandas numpy scipy statsmodels matplotlib openpyxl factor_analyzer
```

## 数据要求

- **Excel 路径**：默认 `~/Desktop/远程办公数据.xlsx`，也可通过环境变量或参数指定。
- **变量名**（列名需一致或通过脚本内 ALIASES 映射）：
  - `Tool_Usage_Frequency`（工具使用频率）
  - `Interaction_Quality`（互动质量）
  - `Empathy`（共情）
  - `Team_Cohesion`（团队凝聚力）
  - `Cross_Cultural_Communication`（跨文化沟通）
  - `Inclusive_Leadership`（包容型领导）
- **脚本 2** 还需一列 **`Gender`**（性别，取值如 男/女、Male/Female、M/F），用于 Table 8 与 Figure 3。

## 脚本说明

| 文件 | 内容 |
|------|------|
| **rerun_tables234.py** | Table 2（Cronbach’s α, KMO, Bartlett）、Table 3（Pearson 相关+显著性星号）、Table 4（链式中介路径系数） |
| **rerun_tables_5_6_8_and_figs_bw.py** | Table 5（Bootstrap 间接效应）、Table 6（SEM 路径 β/t/p/R²）、Table 8（男性子组）；Figure 1～3（Bootstrap 分布、SEM 路径图、男女路径对比） |

## 运行方式

**1. 使用默认路径（桌面上的 `远程办公数据.xlsx`）**

```bash
cd remote_work_analysis
python rerun_tables234.py
python rerun_tables_5_6_8_and_figs_bw.py
```

**2. 指定 Excel 路径**

```bash
export REMOTE_WORK_DATA="/path/to/远程办公数据.xlsx"
python rerun_tables234.py
python rerun_tables_5_6_8_and_figs_bw.py
```

或（仅脚本 2 支持命令行参数）：

```bash
python rerun_tables_5_6_8_and_figs_bw.py "/path/to/远程办公数据.xlsx"
```

**3. 指定输出目录（默认桌面）**

```bash
export REMOTE_WORK_OUT="/path/to/output"
python rerun_tables234.py
python rerun_tables_5_6_8_and_figs_bw.py
```

## 输出文件（默认在桌面）

- **Table2_reliability_validity.csv**
- **Table3_pearson_correlation.csv**
- **Table4_chain_mediation_paths.csv**
- **Table5_bootstrap_indirect_effect.csv**、**Table5_bootstrap_distribution.csv**
- **Table6_sem_results.csv**
- **Table8_multigroup_male.csv**
- **Figure1_Bootstrap_IndirectEffect_BW.png**
- **Figure2_SEM_PathDiagram_BW.png**
- **Figure3_Female_vs_Male_Paths_BW.png**

分享给他人时，只需提供本仓库链接与数据文件说明（变量名/性别列），对方即可在本地复现表格与图形。
