import pandas as pd
import matplotlib.pyplot as plt

# =========================
# 基本设置（完全按你的）
# =========================
FILE_PATH = "/Users/orlando-alex/Downloads/mpd2020.xlsx"
SHEET_NAME = "Full data"   # ← 严格使用你的 sheet 名

COUNTRIES = ["USA", "GBR", "CHN"]
START_YEAR = 1500

# 输出图片（高清，作业可直接用）
OUT_FIG1 = "Q1_Maddison_USA_GBR_CHN_log.png"
OUT_FIG2 = "Q1_Maddison_CHN.png"

# =========================
# 读取数据
# =========================
df = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)

# 列名（Maddison 2020 的 Full data 就是这些）
# 如果你这个文件是官方 mpd2020，这里 100% 对
df = df[["year", "countrycode", "gdppc"]].dropna()

df = df.query(
    "countrycode in @COUNTRIES and year >= @START_YEAR"
).sort_values(["countrycode", "year"])

# =========================
# 图 1：USA / GBR / CHN（log scale，加分项）
# =========================
fig, ax = plt.subplots(figsize=(11, 6.5))

for c in COUNTRIES:
    temp = df[df["countrycode"] == c]
    ax.plot(temp["year"], temp["gdppc"], linewidth=2, label=c)

ax.set_title("Maddison Project: GDP per capita since 1500 (log scale)")
ax.set_xlabel("Year")
ax.set_ylabel("GDP per capita (gdppc)")
ax.set_yscale("log")
ax.set_xlim(START_YEAR, int(df["year"].max()))

# 历史阶段标注（加分项）
ax.axvspan(1760, 1840, alpha=0.12)
ax.text(1800, ax.get_ylim()[1], "Industrial Revolution",
        ha="center", va="top", fontsize=9)

ax.axvspan(1914, 1945, alpha=0.12)
ax.text(1930, ax.get_ylim()[1], "Inter-war",
        ha="center", va="top", fontsize=9)

ax.axvspan(1945, 1973, alpha=0.12)
ax.text(1959, ax.get_ylim()[1], "Post-WWII",
        ha="center", va="top", fontsize=9)

ax.grid(True, which="both", linestyle="--", alpha=0.4)
ax.legend()

fig.tight_layout()
fig.savefig(OUT_FIG1, dpi=300)
plt.show()

print(f"Saved: {OUT_FIG1}")

# =========================
# 图 2：中国单独（线性尺度）
# =========================
df_china = df[df["countrycode"] == "CHN"]

fig, ax = plt.subplots(figsize=(11, 6.5))
ax.plot(df_china["year"], df_china["gdppc"], linewidth=2)

ax.set_title("Maddison Project: China GDP per capita since 1500")
ax.set_xlabel("Year")
ax.set_ylabel("GDP per capita (gdppc)")
ax.set_xlim(START_YEAR, int(df["year"].max()))

# 改革开放标注（写 comment 很好用）
ax.axvline(1978, linestyle="--", linewidth=1.5)
ax.text(1978, ax.get_ylim()[1], "1978",
        ha="left", va="top", fontsize=10)

ax.grid(True, linestyle="--", alpha=0.4)

fig.tight_layout()
fig.savefig(OUT_FIG2, dpi=300)
plt.show()

print(f"Saved: {OUT_FIG2}")
