# 远程办公数据 — 表格与图表重跑脚本 (Remote Work Analysis)

用于从 **远程办公数据.xlsx** 重算论文中的 Table 2～Table 8 以及 3 张黑白图，便于复现与分享。

---

## 朋友打开链接 404 怎么办？

- **原因**：仓库是**私有**时，别人未登录或没权限会看到 404。
- **办法 1**：把仓库改为公开  
  GitHub 仓库页 → **Settings** → **General** → **Danger Zone** → **Change repository visibility** → 选 **Public**。
- **办法 2**：不依赖仓库，直接发**单文件**给朋友  
  使用本目录下的 **`remote_work_full.py`**（单文件完整代码）：
  1. 你把 `remote_work_full.py` 发给她（微信/邮件/网盘）。
  2. 她保存到电脑，把 **远程办公数据.xlsx** 放桌面。
  3. 安装依赖：`pip install pandas numpy scipy statsmodels matplotlib openpyxl factor_analyzer`
  4. 运行：`python remote_work_full.py`  
  输出会出现在桌面（或脚本里改 `OUT_DIR`）。
- **办法 3**：你建一个**公开 Gist**，她就能用链接打开、复制代码  
  打开 https://gist.github.com → 新建 → 把 `remote_work_full.py` 内容粘贴进去 → 创建 public gist → 把生成的链接发给她。

---

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
| **remote_work_full.py** | 单文件完整版：Table 2～8 + Figure1，复制即跑，可直接发朋友 |
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
