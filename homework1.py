import pandas as pd
import matplotlib.pyplot as plt

# =========================
# 0) settings (固定 Full Data)
# =========================
FILE_PATH = "/Users/orlando-alex/Downloads/mpd2020.xlsx"
SHEET_NAME = "Full Data"

OUT_FIG1 = "hw1_q1_gdppc_USA_GBR_CHN_since1500_log_annotated.png"
OUT_FIG2 = "hw1_q1_gdppc_CHN_since1500_annotated.png"

COUNTRIES = ["USA", "GBR", "CHN"]
START_YEAR = 1500

# 加分项：标注关键历史阶段（可视化）
MARKS = [
    ("Industrial Revolution", 1760, 1840),
    ("Inter-war", 1914, 1945),
    ("Post-WWII", 1945, 1973),
]

# =========================
# 1) helpers
# =========================
def pick_col(df: pd.DataFrame, candidates: list[str]) -> str:
    cols = set(df.columns)
    for c in candidates:
        if c in cols:
            return c
    raise KeyError(
        f"None of these columns exist: {candidates}\n"
        f"Available columns: {sorted(df.columns)}"
    )

def shade_periods(ax, periods):
    # 画淡色背景并写标签（加分项：方便你写 comment）
    for label, start, end in periods:
        ax.axvspan(start, end, alpha=0.12)
        # 标签放在图上方
        y_top = ax.get_ylim()[1]
        ax.text((start + end) / 2, y_top, label, ha="center", va="top", fontsize=9)

def label_line_end(ax, x, y, text):
    # 在曲线末端写 “USA/GBR/CHN”（加分项：不用看 legend）
    ax.text(x, y, f" {text}", va="center", fontsize=10)

# =========================
# 2) load data (强制 Full Data)
# =========================
df = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)

# 兼容不同版本 Maddison 的列名（尽量稳）
col_country = pick_col(df, ["countrycode", "ccode", "code", "iso3c", "iso3"])
col_year = pick_col(df, ["year", "Year"])
col_gdppc = pick_col(df, ["gdppc", "gdppc_2011", "gdppc_2017", "gdppc_1990"])

df_use = (
    df[[col_year, col_country, col_gdppc]]
    .rename(columns={col_year: "year", col_country: "countrycode", col_gdppc: "gdppc"})
    .dropna()
    .query("countrycode in @COUNTRIES and year >= @START_YEAR")
    .sort_values(["countrycode", "year"])
)

# =========================
# 3) Figure 1: USA/GBR/CHN (log scale + shaded periods + end labels)
# =========================
fig, ax = plt.subplots(figsize=(11, 6.5))

# 先画线
for c in COUNTRIES:
    temp = df_use[df_use["countrycode"] == c]
    ax.plot(temp["year"], temp["gdppc"], linewidth=2, label=c)

ax.set_title("Maddison Project: GDP per capita since 1500 (log scale)")
ax.set_xlabel("Year")
ax.set_ylabel("GDP per capita (gdppc)")
ax.set_xlim(START_YEAR, int(df_use["year"].max()))

# 加分项：log scale（长期增长对比更清楚）
ax.set_yscale("log")

# 轻网格
ax.grid(True, which="both", linestyle="--", linewidth=0.5, alpha=0.35)

# 先确定 ylim 再标注历史阶段背景
fig.canvas.draw()
shade_periods(ax, MARKS)

# 加分项：把国家标签贴到曲线末端（不用看 legend）
for c in COUNTRIES:
    temp = df_use[df_use["countrycode"] == c]
    x_end = temp["year"].iloc[-1]
    y_end = temp["gdppc"].iloc[-1]
    label_line_end(ax, x_end, y_end, c)

# legend 也保留（老师喜欢清晰）
ax.legend(loc="upper left")

fig.tight_layout()
fig.savefig(OUT_FIG1, dpi=300)
plt.show()
print(f"Saved: {OUT_FIG1}")

# =========================
# 4) Figure 2: China only (linear scale + 1978 marker)
# =========================
df_chn = df_use[df_use["countrycode"] == "CHN"]

fig, ax = plt.subplots(figsize=(11, 6.5))
ax.plot(df_chn["year"], df_chn["gdppc"], linewidth=2)

ax.set_title("Maddison Project: China GDP per capita since 1500")
ax.set_xlabel("Year")
ax.set_ylabel("GDP per capita (gdppc)")
ax.set_xlim(START_YEAR, int(df_use["year"].max()))
ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.35)

# 加分项：标出 1978（方便你写 comment）
ax.axvline(1978, linestyle="--", linewidth=1.5)
ax.text(1978, ax.get_ylim()[1], " 1978", ha="left", va="top", fontsize=10)

fig.tight_layout()
fig.savefig(OUT_FIG2, dpi=300)
plt.show()
print(f"Saved: {OUT_FIG2}")
