# -*- coding: utf-8 -*-
"""
Re-run Table 2 (alpha / KMO / Bartlett), Table 3 (Pearson correlation with stars),
and Table 4 (chain mediation path coefficients with stars).

Data: Excel with 6 variables (Tool Usage Frequency, Interaction Quality, Empathy,
      Team Cohesion, Cross-Cultural Communication, Inclusive Leadership).
Output: Console print + CSVs to OUT_DIR (default Desktop).
"""
from __future__ import annotations

import os
import sys
import warnings
from typing import List

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf

warnings.filterwarnings("ignore")

# -----------------------------
# Config
# -----------------------------
FILE_PATH = os.environ.get("REMOTE_WORK_DATA", "/Users/orlando-alex/Desktop/远程办公数据.xlsx")
OUT_DIR = os.environ.get("REMOTE_WORK_OUT", os.path.expanduser("~/Desktop"))

PREFERRED_COLS: List[str] = [
    "Tool_Usage_Frequency",
    "Interaction_Quality",
    "Empathy",
    "Team_Cohesion",
    "Cross_Cultural_Communication",
    "Inclusive_Leadership",
]

ALIASES = {
    "Tool Use Frequency": "Tool_Usage_Frequency",
    "Tool Usage Frequency": "Tool_Usage_Frequency",
    "ToolUseFrequency": "Tool_Usage_Frequency",
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


def sig_star(p: float) -> str:
    if p < 0.001:
        return "***"
    if p < 0.01:
        return "**"
    if p < 0.05:
        return "*"
    return ""


def cronbach_alpha(df_items: pd.DataFrame) -> float:
    x = df_items.to_numpy(dtype=float)
    n_items = x.shape[1]
    if n_items < 2:
        return np.nan
    item_vars = x.var(axis=0, ddof=1)
    total_var = x.sum(axis=1).var(ddof=1)
    if total_var == 0:
        return np.nan
    return (n_items / (n_items - 1)) * (1 - item_vars.sum() / total_var)


def ensure_factor_analyzer():
    try:
        from factor_analyzer.factor_analyzer import (
            calculate_bartlett_sphericity,
            calculate_kmo,
        )
        return calculate_kmo, calculate_bartlett_sphericity
    except Exception:
        print("\n[ERROR] Missing dependency: factor_analyzer")
        print("Install: pip install factor_analyzer\n")
        raise


def standardize_cols(df: pd.DataFrame) -> pd.DataFrame:
    renamed = {c: ALIASES[c] for c in df.columns if c in ALIASES}
    if renamed:
        df = df.rename(columns=renamed)
    return df


def coerce_numeric(df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
    out = df.copy()
    for c in cols:
        out[c] = pd.to_numeric(out[c], errors="coerce")
    return out.dropna(subset=cols)


def main() -> None:
    if not os.path.exists(FILE_PATH):
        print(f"[ERROR] File not found: {FILE_PATH}")
        print("Set REMOTE_WORK_DATA to your Excel path, or put 远程办公数据.xlsx on Desktop.")
        sys.exit(1)

    df = pd.read_excel(FILE_PATH)
    df = standardize_cols(df)

    missing = [c for c in PREFERRED_COLS if c not in df.columns]
    if missing:
        print("[ERROR] Missing columns:", missing)
        print("Actual columns:", list(df.columns))
        print("Add aliases in ALIASES if names differ.")
        sys.exit(1)

    df_used = coerce_numeric(df[PREFERRED_COLS].copy(), PREFERRED_COLS)
    n = len(df_used)
    if n < 10:
        print(f"[ERROR] Too few valid rows: n={n}")
        sys.exit(1)

    # ----- Table 2: Alpha, KMO, Bartlett -----
    alpha = cronbach_alpha(df_used)
    calculate_kmo, calculate_bartlett_sphericity = ensure_factor_analyzer()
    kmo_all, kmo_model = calculate_kmo(df_used)
    chi2, p_bart = calculate_bartlett_sphericity(df_used)
    p_vars = df_used.shape[1]
    df_bart = int(p_vars * (p_vars - 1) / 2)

    table2 = pd.DataFrame(
        [
            ["Cronbach's α", round(alpha, 3), "Reliable" if alpha >= 0.70 else "Below threshold"],
            ["KMO", round(float(kmo_model), 3), "Adequate" if kmo_model >= 0.60 else "Inadequate"],
            ["Bartlett's Test χ²", f"{chi2:.2f} (df={df_bart}), p={p_bart:.4g}", "Significant" if p_bart < 0.05 else "Not significant"],
        ],
        columns=["Measure", "Value", "Conclusion"],
    )
    print("\n" + "=" * 70)
    print(f"Table 2. Reliability and Validity Tests (n={n})")
    print("=" * 70)
    print(table2.to_string(index=False))
    table2.to_csv(os.path.join(OUT_DIR, "Table2_reliability_validity.csv"), index=False)

    # ----- Table 3: Pearson correlation with stars -----
    corr_out = pd.DataFrame(index=PREFERRED_COLS, columns=PREFERRED_COLS, dtype=object)
    for v1 in PREFERRED_COLS:
        for v2 in PREFERRED_COLS:
            if v1 == v2:
                corr_out.loc[v1, v2] = "1"
            else:
                r, p = stats.pearsonr(df_used[v1], df_used[v2])
                corr_out.loc[v1, v2] = f"{r:.3f}{sig_star(p)}"

    labels = {
        "Tool_Usage_Frequency": "Tool Usage Frequency",
        "Interaction_Quality": "Interaction Quality",
        "Empathy": "Empathy",
        "Team_Cohesion": "Team Cohesion",
        "Cross_Cultural_Communication": "Cross Cultural Communication",
        "Inclusive_Leadership": "Inclusive Leadership",
    }
    corr_out_named = corr_out.rename(index=labels, columns=labels)
    print("\n" + "=" * 70)
    print("Table 3. Pearson Correlation Matrix")
    print("=" * 70)
    print(corr_out_named.to_string())
    corr_out_named.to_csv(os.path.join(OUT_DIR, "Table3_pearson_correlation.csv"), index=True)

    # ----- Table 4: Chain mediation (standardized betas) -----
    z = df_used.copy()
    for c in PREFERRED_COLS:
        z[c] = (z[c] - z[c].mean()) / (z[c].std(ddof=1) + 1e-12)

    m1 = smf.ols("Empathy ~ Tool_Usage_Frequency", data=z).fit()
    m2 = smf.ols("Team_Cohesion ~ Empathy + Tool_Usage_Frequency", data=z).fit()
    m3 = smf.ols("Cross_Cultural_Communication ~ Team_Cohesion + Empathy + Tool_Usage_Frequency", data=z).fit()
    y_model = smf.ols("Inclusive_Leadership ~ Cross_Cultural_Communication + Team_Cohesion + Empathy + Tool_Usage_Frequency", data=z).fit()

    def beta_p(model, var: str):
        return float(model.params[var]), float(model.pvalues[var])

    rows = [
        ["X (Tool Usage Frequency) → M1 (Empathy)", *beta_p(m1, "Tool_Usage_Frequency")],
        ["M1 (Empathy) → M2 (Team Cohesion)", *beta_p(m2, "Empathy")],
        ["M2 (Team Cohesion) → M3 (Cross Cultural Communication)", *beta_p(m3, "Team_Cohesion")],
        ["M3 (Cross Cultural Communication) → Y (Inclusive Leadership)", *beta_p(y_model, "Cross_Cultural_Communication")],
    ]
    table4 = pd.DataFrame(rows, columns=["Path", "β (standardized)", "p value"])
    table4["p value"] = table4["p value"].apply(lambda x: "<0.001***" if x < 0.001 else f"{x:.3f}{sig_star(x)}")

    print("\n" + "=" * 70)
    print("Table 4. Chain Mediation Analysis (standardized)")
    print("=" * 70)
    print(table4[["Path", "β (standardized)", "p value"]].to_string(index=False))
    table4.to_csv(os.path.join(OUT_DIR, "Table4_chain_mediation_paths.csv"), index=False)

    print("\n" + "-" * 70)
    print("CSVs saved to:", OUT_DIR)
    print("  Table2_reliability_validity.csv, Table3_pearson_correlation.csv, Table4_chain_mediation_paths.csv")
    print("-" * 70)


if __name__ == "__main__":
    main()
