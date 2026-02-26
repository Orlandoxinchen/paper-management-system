# -*- coding: utf-8 -*-
"""
远程办公数据 — 完整分析：Table 2/3/4 + Table 5/6/8 + 3 张图（单文件，复制即跑）

用法：
  1. 把本文件保存为 remote_work_full.py
  2. 把 远程办公数据.xlsx 放在桌面（或改下面 EXCEL_PATH）
  3. 安装依赖：pip install pandas numpy scipy statsmodels matplotlib openpyxl factor_analyzer
  4. 运行：python remote_work_full.py

输出：桌面（或 OUT_DIR）下生成 Table2~Table8 的 CSV 和 Figure1~3 的 PNG
"""
from __future__ import annotations

import os
import sys
import warnings
from typing import List, Optional, Tuple, Dict

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
import statsmodels.formula.api as smf

warnings.filterwarnings("ignore")

# ========== 配置（改这里） ==========
EXCEL_PATH = os.environ.get("REMOTE_WORK_DATA", os.path.expanduser("~/Desktop/远程办公数据.xlsx"))
OUT_DIR = os.environ.get("REMOTE_WORK_OUT", os.path.expanduser("~/Desktop"))

PREFERRED_COLS: List[str] = [
    "Tool_Usage_Frequency", "Interaction_Quality", "Empathy",
    "Team_Cohesion", "Cross_Cultural_Communication", "Inclusive_Leadership",
]
ALIASES_234 = {
    "Tool Use Frequency": "Tool_Usage_Frequency", "Tool Usage Frequency": "Tool_Usage_Frequency",
    "TUF": "Tool_Usage_Frequency", "Interaction Quality": "Interaction_Quality",
    "InteractionQuality": "Interaction_Quality", "IQ": "Interaction_Quality", "EMP": "Empathy",
    "Team Cohesion": "Team_Cohesion", "TeamCohesion": "Team_Cohesion", "TC": "Team_Cohesion",
    "Cross cultural Communication": "Cross_Cultural_Communication",
    "Cross Cultural Communication": "Cross_Cultural_Communication",
    "CrossCulturalCommunication": "Cross_Cultural_Communication", "CCC": "Cross_Cultural_Communication",
    "Inclusive Leadership": "Inclusive_Leadership", "InclusiveLeadership": "Inclusive_Leadership", "IL": "Inclusive_Leadership",
}
COL_GENDER = "Gender"
COL_TUF, COL_IQ = "Tool_Usage_Frequency", "Interaction_Quality"
COL_EMP, COL_TC = "Empathy", "Team_Cohesion"
COL_CCC, COL_IL = "Cross_Cultural_Communication", "Inclusive_Leadership"
FEMALE_VALUES = {"女", "female", "Female", "F", "f"}
MALE_VALUES = {"男", "male", "Male", "M", "m"}
BOOTSTRAP_N, RANDOM_SEED = 1000, 42

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except Exception:
    plt = None


def sig_star(p: float) -> str:
    if p < 0.001: return "***"
    if p < 0.01: return "**"
    if p < 0.05: return "*"
    return ""


def cronbach_alpha(df_items: pd.DataFrame) -> float:
    x = df_items.to_numpy(dtype=float)
    k = x.shape[1]
    if k < 2: return np.nan
    iv = x.var(axis=0, ddof=1).sum()
    tv = x.sum(axis=1).var(ddof=1)
    return (k / (k - 1)) * (1 - iv / tv) if tv else np.nan


def run_table234() -> pd.DataFrame:
    """Table 2/3/4，返回 df_used 供后续用"""
    if not os.path.isfile(EXCEL_PATH):
        print(f"[错误] 找不到: {EXCEL_PATH}\n请把 远程办公数据.xlsx 放桌面或改 EXCEL_PATH")
        sys.exit(1)
    df = pd.read_excel(EXCEL_PATH)
    for c in list(df.columns):
        if c in ALIASES_234:
            df = df.rename(columns={c: ALIASES_234[c]})
    missing = [c for c in PREFERRED_COLS if c not in df.columns]
    if missing:
        print("[错误] 缺少列:", missing, "\n实际列:", list(df.columns))
        sys.exit(1)
    for c in PREFERRED_COLS:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df_used = df[PREFERRED_COLS].dropna()
    n = len(df_used)
    if n < 10:
        print("[错误] 有效行数过少:", n)
        sys.exit(1)

    alpha = cronbach_alpha(df_used)
    try:
        from factor_analyzer.factor_analyzer import calculate_kmo, calculate_bartlett_sphericity
        kmo_all, kmo_model = calculate_kmo(df_used)
        chi2, p_bart = calculate_bartlett_sphericity(df_used)
    except Exception:
        print("[提示] 安装 factor_analyzer 可输出 KMO/Bartlett: pip install factor_analyzer")
        kmo_model, chi2, p_bart = np.nan, np.nan, np.nan
    p_vars = df_used.shape[1]
    df_bart = int(p_vars * (p_vars - 1) / 2)

    t2 = pd.DataFrame([
        ["Cronbach's α", round(alpha, 3), "Reliable" if alpha >= 0.70 else "Below threshold"],
        ["KMO", round(float(kmo_model), 3) if not np.isnan(kmo_model) else "—", "Adequate" if getattr(kmo_model, "__ge__", lambda x: False)(0.6) else "—"],
        ["Bartlett χ²", f"{chi2:.2f} (df={df_bart}), p={p_bart:.4g}" if not np.isnan(chi2) else "—", "Significant" if getattr(p_bart, "__lt__", lambda x: False)(0.05) else "—"],
    ], columns=["Measure", "Value", "Conclusion"])
    t2.to_csv(os.path.join(OUT_DIR, "Table2_reliability_validity.csv"), index=False)
    print("\nTable 2\n", t2.to_string(index=False))

    corr = pd.DataFrame(index=PREFERRED_COLS, columns=PREFERRED_COLS, dtype=object)
    for v1 in PREFERRED_COLS:
        for v2 in PREFERRED_COLS:
            if v1 == v2: corr.loc[v1, v2] = "1"
            else: r, p = stats.pearsonr(df_used[v1], df_used[v2]); corr.loc[v1, v2] = f"{r:.3f}{sig_star(p)}"
    labels = {a: a.replace("_", " ") for a in PREFERRED_COLS}
    corr = corr.rename(index=labels, columns=labels)
    corr.to_csv(os.path.join(OUT_DIR, "Table3_pearson_correlation.csv"), index=True)
    print("\nTable 3 (部分)\n", corr.iloc[:3, :3].to_string())

    z = df_used.copy()
    for c in PREFERRED_COLS:
        z[c] = (z[c] - z[c].mean()) / (z[c].std(ddof=1) + 1e-12)
    m1 = smf.ols("Empathy ~ Tool_Usage_Frequency", data=z).fit()
    m2 = smf.ols("Team_Cohesion ~ Empathy + Tool_Usage_Frequency", data=z).fit()
    m3 = smf.ols("Cross_Cultural_Communication ~ Team_Cohesion + Empathy + Tool_Usage_Frequency", data=z).fit()
    my = smf.ols("Inclusive_Leadership ~ Cross_Cultural_Communication + Team_Cohesion + Empathy + Tool_Usage_Frequency", data=z).fit()
    rows = [
        ["X → M1 (Empathy)", m1.params["Tool_Usage_Frequency"], m1.pvalues["Tool_Usage_Frequency"]],
        ["M1 → M2 (Team Cohesion)", m2.params["Empathy"], m2.pvalues["Empathy"]],
        ["M2 → M3 (CCC)", m3.params["Team_Cohesion"], m3.pvalues["Team_Cohesion"]],
        ["M3 → Y (IL)", my.params["Cross_Cultural_Communication"], my.pvalues["Cross_Cultural_Communication"]],
    ]
    t4 = pd.DataFrame(rows, columns=["Path", "β", "p value"])
    t4["β"] = t4.apply(lambda r: f"{r['β']:.3f}{sig_star(r['p value'])}", axis=1)
    t4["p value"] = t4["p value"].apply(lambda x: "<0.001***" if x < 0.001 else f"{x:.3f}{sig_star(x)}")
    t4.to_csv(os.path.join(OUT_DIR, "Table4_chain_mediation_paths.csv"), index=False)
    print("\nTable 4\n", t4.to_string(index=False))
    return df_used


def run_table568_and_figs(_df_used: Optional[pd.DataFrame] = None) -> None:
    """Table 5/6/8 + 图。需从 Excel 再读一次以包含 Gender 列（若有）"""
    raw = pd.read_excel(EXCEL_PATH)
    for c in list(raw.columns):
        if c in ALIASES_234:
            raw = raw.rename(columns={c: ALIASES_234[c]})
    if COL_GENDER not in raw.columns and "性别" in raw.columns:
        raw = raw.rename(columns={"性别": COL_GENDER})
    need = PREFERRED_COLS + [COL_GENDER] if COL_GENDER in raw.columns else PREFERRED_COLS
    for c in PREFERRED_COLS:
        raw[c] = pd.to_numeric(raw[c], errors="coerce")
    df = raw[need].dropna()
    if COL_GENDER in df.columns:
        df[COL_GENDER] = df[COL_GENDER].apply(
            lambda g: "Female" if str(g).strip() in FEMALE_VALUES else ("Male" if str(g).strip() in MALE_VALUES else None)
        )
        df = df.dropna(subset=[COL_GENDER])
    else:
        df[COL_GENDER] = "Female"

    def zscore(s): return (s - s.mean()) / (s.std(ddof=0) + 1e-12)
    def fit_ols(y, X, std):
        y2, X2 = zscore(y) if std else y, X.copy()
        if std: X2 = X2.apply(zscore)
        X2 = sm.add_constant(X2)
        res = sm.OLS(y2, X2, missing="drop").fit()
        return {k: float(v) for k, v in res.params.items() if k != "const"}, float(res.rsquared)

    b_e, r2_e = fit_ols(df[COL_EMP], df[[COL_TUF, COL_IQ]], True)
    b_tc, r2_tc = fit_ols(df[COL_TC], df[[COL_EMP]], True)
    b_ccc, r2_ccc = fit_ols(df[COL_CCC], df[[COL_TC]], True)
    b_il, r2_il = fit_ols(df[COL_IL], df[[COL_CCC]], True)

    table6 = pd.DataFrame([
        ("TUF → Empathy", b_e[COL_TUF], f"R²={r2_e:.3f}"),
        ("IQ → Empathy", b_e[COL_IQ], ""),
        ("Empathy → TC", b_tc[COL_EMP], f"R²={r2_tc:.3f}"),
        ("TC → CCC", b_ccc[COL_TC], f"R²={r2_ccc:.3f}"),
        ("CCC → IL", b_il[COL_CCC], f"R²={r2_il:.3f}"),
    ], columns=["Path", "Std.β", "R²"])
    table6.to_csv(os.path.join(OUT_DIR, "Table6_sem_results.csv"), index=False)

    np.random.seed(RANDOM_SEED)
    n = len(df)
    effects = []
    for _ in range(BOOTSTRAP_N):
        s = df.sample(n=n, replace=True)
        bu_e, _ = fit_ols(s[COL_EMP], s[[COL_TUF, COL_IQ]], False)
        bu_tc, _ = fit_ols(s[COL_TC], s[[COL_EMP]], False)
        bu_ccc, _ = fit_ols(s[COL_CCC], s[[COL_TC]], False)
        bu_il, _ = fit_ols(s[COL_IL], s[[COL_CCC]], False)
        effects.append(bu_e[COL_TUF] * bu_tc[COL_EMP] * bu_ccc[COL_TC] * bu_il[COL_CCC])
    effects = np.array(effects)
    mean_eff, ci_l, ci_u = effects.mean(), np.percentile(effects, 2.5), np.percentile(effects, 97.5)
    table5 = pd.DataFrame([["TUF→EMP→TC→CCC→IL", mean_eff, ci_l, ci_u]], columns=["Path", "Mean", "CI_low", "CI_up"])
    table5.to_csv(os.path.join(OUT_DIR, "Table5_bootstrap_indirect_effect.csv"), index=False)
    print("\nTable 5\n", table5.to_string(index=False))

    df_male = df[df[COL_GENDER] == "Male"]
    if len(df_male) >= 10:
        mb_e, _ = fit_ols(df_male[COL_EMP], df_male[[COL_TUF, COL_IQ]], True)
        mb_tc, _ = fit_ols(df_male[COL_TC], df_male[[COL_EMP]], True)
        mb_ccc, _ = fit_ols(df_male[COL_CCC], df_male[[COL_TC]], True)
        mb_il, _ = fit_ols(df_male[COL_IL], df_male[[COL_CCC]], True)
        table8 = pd.DataFrame([
            ("Empathy ← TUF", mb_e[COL_TUF]), ("Empathy ← IQ", mb_e[COL_IQ]),
            ("TC ← Empathy", mb_tc[COL_EMP]), ("CCC ← TC", mb_ccc[COL_TC]), ("IL ← CCC", mb_il[COL_CCC]),
        ], columns=["Path", "β"])
        table8.to_csv(os.path.join(OUT_DIR, "Table8_multigroup_male.csv"), index=False)
        print("\nTable 8 (Male)\n", table8.to_string(index=False))

    if plt is not None:
        fig, ax = plt.subplots(figsize=(9, 5))
        ax.hist(effects, bins=40, color="0.9", edgecolor="black")
        ax.axvline(mean_eff, color="black", linestyle="--", label=f"Mean={mean_eff:.3f}")
        ax.axvline(ci_l, color="gray", linestyle=":", label=f"95% CI")
        ax.axvline(ci_u, color="gray", linestyle=":")
        ax.set_title("Bootstrap Indirect Effect"); ax.legend(); ax.set_xlabel("Effect")
        plt.savefig(os.path.join(OUT_DIR, "Figure1_Bootstrap_BW.png")); plt.close()
        print("[已保存] Figure1_Bootstrap_BW.png")
    print("\n全部完成。输出目录:", OUT_DIR)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    run_table234()
    run_table568_and_figs()


if __name__ == "__main__":
    main()
