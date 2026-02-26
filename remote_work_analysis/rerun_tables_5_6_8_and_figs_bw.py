# -*- coding: utf-8 -*-
"""
Recompute Table 5 (Bootstrap indirect effect), Table 6 (SEM path verification),
Table 8 (Male subgroup), and generate 3 B/W figures.

- Table 5: Bootstrap indirect effect (UNSTANDARDIZED b product).
- Table 6: SEM paths with standardized β, t, p, R².
- Table 8: Male subgroup standardized path coefficients.
- Figure 1: Bootstrap distribution histogram (mean + 95% CI).
- Figure 2: SEM path diagram (B/W).
- Figure 3: Female vs Male path coefficients bar chart (B/W).

Usage:
  python rerun_tables_5_6_8_and_figs_bw.py
  python rerun_tables_5_6_8_and_figs_bw.py "/path/to/远程办公数据.xlsx"

Or set REMOTE_WORK_DATA to your Excel path.
"""
from __future__ import annotations

import os
import sys
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import statsmodels.api as sm

# -----------------------------
# Config
# -----------------------------
BOOTSTRAP_N = 1000
RANDOM_SEED = 42
DEFAULT_PATH = os.environ.get("REMOTE_WORK_DATA", "/Users/orlando-alex/Desktop/远程办公数据.xlsx")
OUT_DIR = os.environ.get("REMOTE_WORK_OUT", os.path.expanduser("~/Desktop"))

COL_GENDER = "Gender"
COL_TUF = "Tool_Usage_Frequency"
COL_IQ = "Interaction_Quality"
COL_EMP = "Empathy"
COL_TC = "Team_Cohesion"
COL_CCC = "Cross_Cultural_Communication"
COL_IL = "Inclusive_Leadership"

FEMALE_VALUES = {"女", "female", "Female", "F", "f"}
MALE_VALUES = {"男", "male", "Male", "M", "m"}

# Column aliases (if Excel uses different names)
ALIASES = {
    "Tool Use Frequency": COL_TUF,
    "Tool Usage Frequency": COL_TUF,
    "TUF": COL_TUF,
    "Interaction Quality": COL_IQ,
    "IQ": COL_IQ,
    "EMP": COL_EMP,
    "Team Cohesion": COL_TC,
    "TeamCohesion": COL_TC,
    "TC": COL_TC,
    "Cross Cultural Communication": COL_CCC,
    "CrossCulturalCommunication": COL_CCC,
    "CCC": COL_CCC,
    "Inclusive Leadership": COL_IL,
    "InclusiveLeadership": COL_IL,
    "IL": COL_IL,
}

plt.rcParams.update({
    "figure.dpi": 120,
    "savefig.dpi": 300,
    "font.family": "DejaVu Sans",
    "axes.edgecolor": "black",
    "axes.labelcolor": "black",
    "xtick.color": "black",
    "ytick.color": "black",
    "text.color": "black",
})


def bw_grid(ax, axis: str = "both") -> None:
    ax.grid(True, axis=axis, linestyle=":", linewidth=0.8, color="0.6")
    for sp in ax.spines.values():
        sp.set_color("black")


def normalize_gender(g) -> Optional[str]:
    if pd.isna(g):
        return None
    gs = str(g).strip()
    if gs in FEMALE_VALUES:
        return "Female"
    if gs in MALE_VALUES:
        return "Male"
    return gs


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for c in list(df.columns):
        if c in ALIASES:
            df = df.rename(columns={c: ALIASES[c]})
    if COL_GENDER not in df.columns and "性别" in df.columns:
        df = df.rename(columns={"性别": COL_GENDER})
    need = [COL_GENDER, COL_TUF, COL_IQ, COL_EMP, COL_TC, COL_CCC, COL_IL]
    missing = [c for c in need if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}\nActual: {list(df.columns)}")
    df = df[need].copy()
    df[COL_GENDER] = df[COL_GENDER].apply(normalize_gender)
    for c in [COL_TUF, COL_IQ, COL_EMP, COL_TC, COL_CCC, COL_IL]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df.dropna(subset=need).reset_index(drop=True)


def zscore(s: pd.Series) -> pd.Series:
    s = pd.to_numeric(s, errors="coerce")
    return (s - s.mean()) / (s.std(ddof=0) + 1e-12)


def sig_star(p: float) -> str:
    if p < 0.001:
        return "***"
    if p < 0.01:
        return "**"
    if p < 0.05:
        return "*"
    return ""


def fit_ols(
    y: pd.Series,
    X: pd.DataFrame,
    standardized: bool,
) -> Tuple[Dict[str, float], Dict[str, float], Dict[str, float], float]:
    y2 = y.copy()
    X2 = X.copy()
    if standardized:
        y2 = zscore(y2)
        for c in X2.columns:
            X2[c] = zscore(X2[c])
    X2 = sm.add_constant(X2, has_constant="add")
    res = sm.OLS(y2, X2, missing="drop").fit()
    params = {k: float(v) for k, v in res.params.items() if k != "const"}
    tvals = {k: float(v) for k, v in res.tvalues.items() if k != "const"}
    pvals = {k: float(v) for k, v in res.pvalues.items() if k != "const"}
    return params, tvals, pvals, float(res.rsquared)


def format_p(p: float) -> str:
    if p < 0.001:
        return "< .001"
    return f"{p:.3f}"


def main() -> None:
    file_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    if not os.path.isfile(file_path):
        print(f"[ERROR] File not found: {file_path}")
        print('Usage: python rerun_tables_5_6_8_and_figs_bw.py ["/path/to/远程办公数据.xlsx"]')
        sys.exit(1)

    df_raw = pd.read_excel(file_path)
    df = clean_df(df_raw)
    n = len(df)
    n_f = int((df[COL_GENDER] == "Female").sum())
    n_m = int((df[COL_GENDER] == "Male").sum())
    print(f"[OK] N={n} | Female={n_f} | Male={n_m}")

    # ----- Table 6: SEM (standardized) -----
    b_e, t_e, p_e, r2_e = fit_ols(df[COL_EMP], df[[COL_TUF, COL_IQ]], standardized=True)
    b_tc, t_tc, p_tc, r2_tc = fit_ols(df[COL_TC], df[[COL_EMP]], standardized=True)
    b_ccc, t_ccc, p_ccc, r2_ccc = fit_ols(df[COL_CCC], df[[COL_TC]], standardized=True)
    b_il, t_il, p_il, r2_il = fit_ols(df[COL_IL], df[[COL_CCC]], standardized=True)

    table6_rows = [
        ("Tool Usage Frequency → Empathy", b_e[COL_TUF], t_e[COL_TUF], p_e[COL_TUF], f"R²(Empathy) = {r2_e:.3f}"),
        ("Interaction Quality → Empathy", b_e[COL_IQ], t_e[COL_IQ], p_e[COL_IQ], f"R²(Empathy) = {r2_e:.3f}"),
        ("Empathy → Team Cohesion", b_tc[COL_EMP], t_tc[COL_EMP], p_tc[COL_EMP], f"R²(Team Cohesion) = {r2_tc:.3f}"),
        ("Team Cohesion → Cross-Cultural Communication", b_ccc[COL_TC], t_ccc[COL_TC], p_ccc[COL_TC], f"R²(CCC) = {r2_ccc:.3f}"),
        ("Cross-Cultural Communication → Inclusive Leadership", b_il[COL_CCC], t_il[COL_CCC], p_il[COL_CCC], f"R²(IL) = {r2_il:.3f}"),
    ]
    table6 = pd.DataFrame(table6_rows, columns=["Path / Index", "Std. β", "t value", "p value", "R² / Value"])
    table6["Significance"] = table6["p value"].apply(sig_star)

    # ----- Table 5: Bootstrap indirect (unstandardized) -----
    np.random.seed(RANDOM_SEED)
    effects = []
    for _ in range(BOOTSTRAP_N):
        samp = df.sample(n=n, replace=True)
        bu_e, _, _, _ = fit_ols(samp[COL_EMP], samp[[COL_TUF, COL_IQ]], standardized=False)
        bu_tc, _, _, _ = fit_ols(samp[COL_TC], samp[[COL_EMP]], standardized=False)
        bu_ccc, _, _, _ = fit_ols(samp[COL_CCC], samp[[COL_TC]], standardized=False)
        bu_il, _, _, _ = fit_ols(samp[COL_IL], samp[[COL_CCC]], standardized=False)
        ind = bu_e[COL_TUF] * bu_tc[COL_EMP] * bu_ccc[COL_TC] * bu_il[COL_CCC]
        effects.append(ind)
    effects = np.array(effects)
    mean_eff = float(effects.mean())
    ci_low = float(np.percentile(effects, 2.5))
    ci_up = float(np.percentile(effects, 97.5))
    sig = "***" if (ci_low > 0 or ci_up < 0) and abs(mean_eff) > 0 else ""
    table5 = pd.DataFrame([[
        "TUF → EMP → TC → CCC → IL",
        mean_eff, ci_low, ci_up, sig,
    ]], columns=["Indirect Pathway", "Mean Effect", "95% CI Lower", "95% CI Upper", "Significance"])

    # ----- Table 8: Male subgroup -----
    df_male = df[df[COL_GENDER] == "Male"].copy()
    if len(df_male) >= 10:
        mb_e, mt_e, mp_e, _ = fit_ols(df_male[COL_EMP], df_male[[COL_TUF, COL_IQ]], standardized=True)
        mb_tc, mt_tc, mp_tc, _ = fit_ols(df_male[COL_TC], df_male[[COL_EMP]], standardized=True)
        mb_ccc, mt_ccc, mp_ccc, _ = fit_ols(df_male[COL_CCC], df_male[[COL_TC]], standardized=True)
        mb_il, mt_il, mp_il, mr2_il = fit_ols(df_male[COL_IL], df_male[[COL_CCC]], standardized=True)
        table8 = pd.DataFrame([
            ("Empathy ← Tool Usage Frequency", mb_e[COL_TUF], mp_e[COL_TUF], sig_star(mp_e[COL_TUF])),
            ("Empathy ← Interaction Quality", mb_e[COL_IQ], mp_e[COL_IQ], sig_star(mp_e[COL_IQ])),
            ("Team Cohesion ← Empathy", mb_tc[COL_EMP], mp_tc[COL_EMP], sig_star(mp_tc[COL_EMP])),
            ("CCC ← Team Cohesion", mb_ccc[COL_TC], mp_ccc[COL_TC], sig_star(mp_ccc[COL_TC])),
            ("IL ← CCC", mb_il[COL_CCC], mp_il[COL_CCC], sig_star(mp_il[COL_CCC])),
        ], columns=["Path", "β (standardized)", "p value", "Sig."])
        r2_model_male = mr2_il
        n_male = len(df_male)
    else:
        table8 = pd.DataFrame(columns=["Path", "β (standardized)", "p value", "Sig."])
        r2_model_male = np.nan
        n_male = len(df_male)

    # ----- Save CSVs -----
    table5.to_csv(os.path.join(OUT_DIR, "Table5_bootstrap_indirect_effect.csv"), index=False, encoding="utf-8-sig")
    table6.to_csv(os.path.join(OUT_DIR, "Table6_sem_results.csv"), index=False, encoding="utf-8-sig")
    table8.to_csv(os.path.join(OUT_DIR, "Table8_multigroup_male.csv"), index=False, encoding="utf-8-sig")
    pd.DataFrame({"bootstrap_indirect_effect": effects}).to_csv(
        os.path.join(OUT_DIR, "Table5_bootstrap_distribution.csv"), index=False, encoding="utf-8-sig"
    )
    print("[SAVED CSV]", OUT_DIR)

    # ----- Figure 1: Bootstrap histogram -----
    fig, ax = plt.subplots(figsize=(10.5, 5.8))
    ax.hist(effects, bins=40, edgecolor="black", color="0.88")
    ax.axvline(mean_eff, linestyle="--", color="black", linewidth=1.8, label=f"Mean = {mean_eff:.3f}")
    ax.axvline(ci_low, linestyle=":", color="black", linewidth=2.0, label=f"95% CI Lower = {ci_low:.3f}")
    ax.axvline(ci_up, linestyle=":", color="black", linewidth=2.0, label=f"95% CI Upper = {ci_up:.3f}")
    ax.set_title("Bootstrap Distribution of Indirect Effect (TUF → EMP → TC → CCC → IL)")
    ax.set_xlabel("Indirect Effect Estimate")
    ax.set_ylabel("Frequency")
    ax.legend(frameon=True, edgecolor="black")
    bw_grid(ax)
    fig1_path = os.path.join(OUT_DIR, "Figure1_Bootstrap_IndirectEffect_BW.png")
    plt.tight_layout()
    plt.savefig(fig1_path)
    plt.close()
    print("[SAVED FIG]", fig1_path)

    # ----- Figure 2: SEM path diagram -----
    fig, ax = plt.subplots(figsize=(13.8, 5.6))
    ax.axis("off")
    nodes = {
        "Tool Use\nFrequency": (0.0, 1.25),
        "Interaction\nQuality": (0.0, -1.25),
        "Empathy": (3.2, 0.0),
        "Team\nCohesion": (6.4, 0.0),
        "Cross-Cultural\nCommunication": (9.8, 0.0),
        "Inclusive\nLeadership": (13.2, 0.0),
    }
    for label, (x, y) in nodes.items():
        ax.scatter([x], [y], s=1700, facecolors="white", edgecolors="black", linewidths=2.0, zorder=3)
        ax.text(x, y, label, ha="center", va="center", fontsize=11)

    def arrow(a: str, b: str, txt: str, dy: float = 0.22) -> None:
        x1, y1 = nodes[a]
        x2, y2 = nodes[b]
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(arrowstyle="->", color="black", linewidth=1.9), zorder=2)
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my + dy, txt, ha="center", va="bottom", fontsize=11)

    arrow("Tool Use\nFrequency", "Empathy", f"β = {b_e[COL_TUF]:.2f}")
    arrow("Interaction\nQuality", "Empathy", f"β = {b_e[COL_IQ]:.2f}", dy=-0.36)
    arrow("Empathy", "Team\nCohesion", f"β = {b_tc[COL_EMP]:.2f}")
    arrow("Team\nCohesion", "Cross-Cultural\nCommunication", f"β = {b_ccc[COL_TC]:.2f}")
    arrow("Cross-Cultural\nCommunication", "Inclusive\nLeadership", f"β = {b_il[COL_CCC]:.2f}")
    for label, (x, y) in nodes.items():
        if label == "Empathy":
            ax.text(x, -0.98, f"R² = {r2_e:.2f}", ha="center", fontsize=11)
        elif label == "Team\nCohesion":
            ax.text(x, -0.98, f"R² = {r2_tc:.2f}", ha="center", fontsize=11)
        elif label == "Cross-Cultural\nCommunication":
            ax.text(x, -0.98, f"R² = {r2_ccc:.2f}", ha="center", fontsize=11)
        elif label == "Inclusive\nLeadership":
            ax.text(x, -0.98, f"R² = {r2_il:.2f}", ha="center", fontsize=11)
    ax.set_title("Structural Equation Model (STANDARDIZED β, B/W)")
    fig2_path = os.path.join(OUT_DIR, "Figure2_SEM_PathDiagram_BW.png")
    plt.tight_layout()
    plt.savefig(fig2_path)
    plt.close()
    print("[SAVED FIG]", fig2_path)

    # ----- Figure 3: Female vs Male -----
    df_female = df[df[COL_GENDER] == "Female"].copy()

    def subgroup_betas(subdf: pd.DataFrame) -> Optional[dict]:
        if len(subdf) < 10:
            return None
        se, _, _, _ = fit_ols(subdf[COL_EMP], subdf[[COL_TUF, COL_IQ]], standardized=True)
        stc, _, _, _ = fit_ols(subdf[COL_TC], subdf[[COL_EMP]], standardized=True)
        sccc, _, _, _ = fit_ols(subdf[COL_CCC], subdf[[COL_TC]], standardized=True)
        sil, _, _, r2 = fit_ols(subdf[COL_IL], subdf[[COL_CCC]], standardized=True)
        return {
            "Empathy <- Tool Use Frequency": se[COL_TUF],
            "Empathy <- Interaction Quality": se[COL_IQ],
            "Team Cohesion <- Empathy": stc[COL_EMP],
            "CCC <- Team Cohesion": sccc[COL_TC],
            "IL <- CCC": sil[COL_CCC],
            "n": len(subdf),
            "r2_il": r2,
        }

    female = subgroup_betas(df_female)
    male = subgroup_betas(df_male)
    paths = ["Empathy <- Tool Use Frequency", "Empathy <- Interaction Quality", "Team Cohesion <- Empathy", "CCC <- Team Cohesion", "IL <- CCC"]

    if female and male:
        x = np.arange(len(paths))
        width = 0.36
        fig, ax = plt.subplots(figsize=(12.6, 6.2))
        ax.bar(x - width / 2, [female[p] for p in paths], width, label=f"Female (n={female['n']})", color="white", edgecolor="black", linewidth=1.7, hatch="///")
        ax.bar(x + width / 2, [male[p] for p in paths], width, label=f"Male (n={male['n']})", color="0.85", edgecolor="black", linewidth=1.7, hatch="...")
        ax.set_ylabel("Standardized β")
        ax.set_title("Female vs. Male: Path Coefficients (B/W)")
        ax.set_xticks(x)
        ax.set_xticklabels(paths, rotation=18, ha="right")
        ax.legend(frameon=True, edgecolor="black")
        bw_grid(ax, axis="y")
        fig3_path = os.path.join(OUT_DIR, "Figure3_Female_vs_Male_Paths_BW.png")
        plt.tight_layout()
        plt.savefig(fig3_path)
        plt.close()
        print("[SAVED FIG]", fig3_path)
    else:
        print("[SKIP] Figure 3 (subgroup too small)")

    # ----- Console summary -----
    print("\nTable 5. Bootstrap Indirect Effect")
    print(table5.to_string(index=False))
    print("\nTable 6. SEM Results")
    print(table6.to_string(index=False))
    print("\nTable 8. Male subgroup")
    print(table8.to_string(index=False))
    print(f"\nR²(IL, male): {r2_model_male:.3f} | n_male: {n_male}")
    print("\nAll outputs saved to:", OUT_DIR)


if __name__ == "__main__":
    main()
