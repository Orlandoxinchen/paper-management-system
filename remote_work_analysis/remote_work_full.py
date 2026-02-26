# -*- coding: utf-8 -*-
"""
远程办公数据 - 完整分析：Table 2/3/4 + Table 5/6/8 + Figure1（单文件，复制即跑）

用法：
  1. 保存本文件为 .py（如 remote_work_full.py）
  2. 把 远程办公数据.xlsx 放在桌面（或修改下面 EXCEL_PATH）
  3. 安装：pip install pandas numpy scipy statsmodels matplotlib openpyxl factor_analyzer
  4. 运行：python remote_work_full.py

输出：Table2~Table8 的 CSV 和 Figure1 的 PNG，默认在桌面。
"""
from __future__ import print_function

import os
import sys
import warnings

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
import statsmodels.formula.api as smf

warnings.filterwarnings("ignore")

# ========== 配置（可改） ==========
EXCEL_PATH = os.environ.get("REMOTE_WORK_DATA", os.path.expanduser("~/Desktop/远程办公数据.xlsx"))
OUT_DIR = os.environ.get("REMOTE_WORK_OUT", os.path.expanduser("~/Desktop"))

PREFERRED_COLS = [
    "Tool_Usage_Frequency",
    "Interaction_Quality",
    "Empathy",
    "Team_Cohesion",
    "Cross_Cultural_Communication",
    "Inclusive_Leadership",
]
ALIASES_234 = {
    "Tool Use Frequency": "Tool_Usage_Frequency",
    "Tool Usage Frequency": "Tool_Usage_Frequency",
    "TUF": "Tool_Usage_Frequency",
    "Interaction Quality": "Interaction_Quality",
    "InteractionQuality": "Interaction_Quality",
    "IQ": "Interaction_Quality",
    "EMP": "Empathy",
    "Team Cohesion": "Team_Cohesion",
    "TeamCohesion": "Team_Cohesion",
    "TC": "Team_Cohesion",
    "Cross cultural Communication": "Cross_Cultural_Communication",
    "Cross Cultural Communication": "Cross_Cultural_Communication",
    "CrossCulturalCommunication": "Cross_Cultural_Communication",
    "CCC": "Cross_Cultural_Communication",
    "Inclusive Leadership": "Inclusive_Leadership",
    "InclusiveLeadership": "Inclusive_Leadership",
    "IL": "Inclusive_Leadership",
}
COL_GENDER = "Gender"
COL_TUF = "Tool_Usage_Frequency"
COL_IQ = "Interaction_Quality"
COL_EMP = "Empathy"
COL_TC = "Team_Cohesion"
COL_CCC = "Cross_Cultural_Communication"
COL_IL = "Inclusive_Leadership"
FEMALE_VALUES = set(["女", "female", "Female", "F", "f"])
MALE_VALUES = set(["男", "male", "Male", "M", "m"])
BOOTSTRAP_N = 1000
RANDOM_SEED = 42

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_PLOT = True
except Exception:
    HAS_PLOT = False
    plt = None


def sig_star(p):
    if p < 0.001:
        return "***"
    if p < 0.01:
        return "**"
    if p < 0.05:
        return "*"
    return ""


def cronbach_alpha(df_items):
    x = df_items.values.astype(float)
    k = x.shape[1]
    if k < 2:
        return np.nan
    item_vars = np.var(x, axis=0, ddof=1).sum()
    total_var = np.var(x.sum(axis=1), ddof=1)
    if total_var == 0:
        return np.nan
    return (k / (k - 1)) * (1 - item_vars / total_var)


def run_table234():
    if not os.path.isfile(EXCEL_PATH):
        print("[错误] 找不到文件:", EXCEL_PATH)
        print("请把 远程办公数据.xlsx 放在桌面，或修改脚本开头的 EXCEL_PATH")
        sys.exit(1)
    df = pd.read_excel(EXCEL_PATH)
    for c in list(df.columns):
        if c in ALIASES_234:
            df = df.rename(columns={c: ALIASES_234[c]})
    missing = [c for c in PREFERRED_COLS if c not in df.columns]
    if missing:
        print("[错误] Excel 缺少列:", missing)
        print("当前列名:", list(df.columns))
        sys.exit(1)
    for c in PREFERRED_COLS:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df_used = df[PREFERRED_COLS].dropna()
    n = len(df_used)
    if n < 10:
        print("[错误] 有效数据行数过少 (n=%d)" % n)
        sys.exit(1)

    alpha = cronbach_alpha(df_used)
    kmo_model = np.nan
    chi2 = np.nan
    p_bart = np.nan
    try:
        from factor_analyzer.factor_analyzer import calculate_kmo
        from factor_analyzer.factor_analyzer import calculate_bartlett_sphericity
        kmo_all, kmo_model = calculate_kmo(df_used)
        chi2, p_bart = calculate_bartlett_sphericity(df_used)
    except ImportError:
        print("[提示] 未安装 factor_analyzer，跳过 KMO/Bartlett。可运行: pip install factor_analyzer")
    except Exception as e:
        print("[提示] KMO/Bartlett 计算跳过:", str(e))

    p_vars = df_used.shape[1]
    df_bart = int(p_vars * (p_vars - 1) / 2)
    row1_val = round(float(alpha), 3)
    row2_val = round(float(kmo_model), 3) if not (isinstance(kmo_model, float) and np.isnan(kmo_model)) else "--"
    row3_val = ("%.2f (df=%d), p=%s" % (chi2, df_bart, ("%.4g" % p_bart))) if not (isinstance(chi2, float) and np.isnan(chi2)) else "--"
    t2 = pd.DataFrame([
        ["Cronbach's alpha", row1_val, "Reliable" if alpha >= 0.70 else "Below threshold"],
        ["KMO", row2_val, "Adequate" if (isinstance(kmo_model, (int, float)) and not np.isnan(kmo_model) and kmo_model >= 0.6) else "See value"],
        ["Bartlett Test", row3_val, "Significant" if (isinstance(p_bart, (int, float)) and not np.isnan(p_bart) and p_bart < 0.05) else "See value"],
    ], columns=["Measure", "Value", "Conclusion"])
    t2.to_csv(os.path.join(OUT_DIR, "Table2_reliability_validity.csv"), index=False, encoding="utf-8-sig")
    print("\n========== Table 2 ==========")
    print(t2.to_string(index=False))

    corr = pd.DataFrame(index=PREFERRED_COLS, columns=PREFERRED_COLS, dtype=object)
    for v1 in PREFERRED_COLS:
        for v2 in PREFERRED_COLS:
            if v1 == v2:
                corr.loc[v1, v2] = "1"
            else:
                r, p = stats.pearsonr(df_used[v1], df_used[v2])
                corr.loc[v1, v2] = "%.3f%s" % (r, sig_star(p))
    labels = {a: a.replace("_", " ") for a in PREFERRED_COLS}
    corr = corr.rename(index=labels, columns=labels)
    corr.to_csv(os.path.join(OUT_DIR, "Table3_pearson_correlation.csv"), index=True, encoding="utf-8-sig")
    print("\n========== Table 3 (部分) ==========")
    print(corr.iloc[:3, :3].to_string())

    z = df_used.copy()
    for c in PREFERRED_COLS:
        z[c] = (z[c] - z[c].mean()) / (z[c].std(ddof=1) + 1e-12)
    m1 = smf.ols("Empathy ~ Tool_Usage_Frequency", data=z).fit()
    m2 = smf.ols("Team_Cohesion ~ Empathy + Tool_Usage_Frequency", data=z).fit()
    m3 = smf.ols("Cross_Cultural_Communication ~ Team_Cohesion + Empathy + Tool_Usage_Frequency", data=z).fit()
    my = smf.ols("Inclusive_Leadership ~ Cross_Cultural_Communication + Team_Cohesion + Empathy + Tool_Usage_Frequency", data=z).fit()
    rows = [
        ["X -> M1 (Empathy)", m1.params["Tool_Usage_Frequency"], m1.pvalues["Tool_Usage_Frequency"]],
        ["M1 -> M2 (Team Cohesion)", m2.params["Empathy"], m2.pvalues["Empathy"]],
        ["M2 -> M3 (CCC)", m3.params["Team_Cohesion"], m3.pvalues["Team_Cohesion"]],
        ["M3 -> Y (IL)", my.params["Cross_Cultural_Communication"], my.pvalues["Cross_Cultural_Communication"]],
    ]
    t4 = pd.DataFrame(rows, columns=["Path", "beta", "p value"])
    t4["beta"] = t4.apply(lambda r: "%.3f%s" % (r["beta"], sig_star(r["p value"])), axis=1)
    t4["p value"] = t4["p value"].apply(lambda x: "<0.001***" if x < 0.001 else "%.3f%s" % (x, sig_star(x)))
    t4.to_csv(os.path.join(OUT_DIR, "Table4_chain_mediation_paths.csv"), index=False, encoding="utf-8-sig")
    print("\n========== Table 4 ==========")
    print(t4.to_string(index=False))


def run_table568_and_figs():
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
        def _gender(g):
            gs = str(g).strip()
            if gs in FEMALE_VALUES:
                return "Female"
            if gs in MALE_VALUES:
                return "Male"
            return None
        df[COL_GENDER] = df[COL_GENDER].apply(_gender)
        df = df.dropna(subset=[COL_GENDER])
    else:
        df[COL_GENDER] = "Female"

    def zscore(s):
        return (s - s.mean()) / (s.std(ddof=0) + 1e-12)

    def fit_ols(y, X, std):
        y2 = zscore(y) if std else y
        X2 = X.copy()
        if std:
            for col in X2.columns:
                X2[col] = zscore(X2[col])
        X2 = sm.add_constant(X2)
        res = sm.OLS(y2, X2, missing="drop").fit()
        params = {k: float(v) for k, v in res.params.items() if k != "const"}
        return params, float(res.rsquared)

    b_e, r2_e = fit_ols(df[COL_EMP], df[[COL_TUF, COL_IQ]], True)
    b_tc, r2_tc = fit_ols(df[COL_TC], df[[COL_EMP]], True)
    b_ccc, r2_ccc = fit_ols(df[COL_CCC], df[[COL_TC]], True)
    b_il, r2_il = fit_ols(df[COL_IL], df[[COL_CCC]], True)

    table6 = pd.DataFrame([
        ("TUF -> Empathy", b_e[COL_TUF], "R2=%.3f" % r2_e),
        ("IQ -> Empathy", b_e[COL_IQ], ""),
        ("Empathy -> TC", b_tc[COL_EMP], "R2=%.3f" % r2_tc),
        ("TC -> CCC", b_ccc[COL_TC], "R2=%.3f" % r2_ccc),
        ("CCC -> IL", b_il[COL_CCC], "R2=%.3f" % r2_il),
    ], columns=["Path", "Std_beta", "R2"])
    table6.to_csv(os.path.join(OUT_DIR, "Table6_sem_results.csv"), index=False, encoding="utf-8-sig")
    print("\n========== Table 6 ==========")
    print(table6.to_string(index=False))

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
    mean_eff = float(np.mean(effects))
    ci_l = float(np.percentile(effects, 2.5))
    ci_u = float(np.percentile(effects, 97.5))
    table5 = pd.DataFrame([["TUF->EMP->TC->CCC->IL", mean_eff, ci_l, ci_u]], columns=["Path", "Mean", "CI_low", "CI_up"])
    table5.to_csv(os.path.join(OUT_DIR, "Table5_bootstrap_indirect_effect.csv"), index=False, encoding="utf-8-sig")
    print("\n========== Table 5 ==========")
    print(table5.to_string(index=False))

    df_male = df[df[COL_GENDER] == "Male"]
    if len(df_male) >= 10:
        mb_e, _ = fit_ols(df_male[COL_EMP], df_male[[COL_TUF, COL_IQ]], True)
        mb_tc, _ = fit_ols(df_male[COL_TC], df_male[[COL_EMP]], True)
        mb_ccc, _ = fit_ols(df_male[COL_CCC], df_male[[COL_TC]], True)
        mb_il, _ = fit_ols(df_male[COL_IL], df_male[[COL_CCC]], True)
        table8 = pd.DataFrame([
            ("Empathy <- TUF", mb_e[COL_TUF]),
            ("Empathy <- IQ", mb_e[COL_IQ]),
            ("TC <- Empathy", mb_tc[COL_EMP]),
            ("CCC <- TC", mb_ccc[COL_TC]),
            ("IL <- CCC", mb_il[COL_CCC]),
        ], columns=["Path", "beta"])
        table8.to_csv(os.path.join(OUT_DIR, "Table8_multigroup_male.csv"), index=False, encoding="utf-8-sig")
        print("\n========== Table 8 (Male) ==========")
        print(table8.to_string(index=False))

    if HAS_PLOT and plt is not None:
        fig, ax = plt.subplots(figsize=(9, 5))
        ax.hist(effects, bins=40, color="0.9", edgecolor="black")
        ax.axvline(mean_eff, color="black", linestyle="--", label="Mean=%.3f" % mean_eff)
        ax.axvline(ci_l, color="gray", linestyle=":")
        ax.axvline(ci_u, color="gray", linestyle=":")
        ax.set_title("Bootstrap Indirect Effect")
        ax.legend()
        ax.set_xlabel("Effect")
        plt.tight_layout()
        plt.savefig(os.path.join(OUT_DIR, "Figure1_Bootstrap_BW.png"))
        plt.close()
        print("\n[已保存] Figure1_Bootstrap_BW.png")
    print("\n全部完成。输出目录: %s" % OUT_DIR)


def main():
    try:
        os.makedirs(OUT_DIR, exist_ok=True)
        run_table234()
        run_table568_and_figs()
    except Exception as e:
        print("\n[运行出错]", str(e))
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
