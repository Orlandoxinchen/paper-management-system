import pandas as pd
import matplotlib.pyplot as plt

# =====================================
# Q2: Kaldor Stylized Facts (PWT 11.0)
# =====================================

# 1. 读取数据（你的真实路径）
FILE_PATH = "/Users/orlando-alex/Desktop/pwt110.xlsx"
df = pd.read_excel(FILE_PATH, sheet_name="Data")

# 2. 选择国家
countries = ["GBR", "CAN", "JPN"]

# 3. 只保留需要的变量
cols = ["countrycode", "year", "rgdpna", "rnna", "delta", "labsh"]
df = (
    df[cols]
    .query("countrycode in @countries")
    .dropna()
    .sort_values(["countrycode", "year"])
)

# 4. 计算投资 I_t
# I_t = K_{t+1} - (1 - delta) * K_t
df["K_next"] = df.groupby("countrycode")["rnna"].shift(-1)
df["I"] = df["K_next"] - (1 - df["delta"]) * df["rnna"]

# 5. 构造比率
df["I_Y"] = df["I"] / df["rgdpna"]
df["K_Y"] = df["rnna"] / df["rgdpna"]

# 去掉最后一年（没有 K_{t+1}）
df = df.dropna(subset=["I_Y"])

# 6. 画图函数
def plot_ratio(var, title, ylabel, filename):
    plt.figure(figsize=(10, 6))
    for c in countries:
        temp = df[df["countrycode"] == c]
        plt.plot(temp["year"], temp[var], label=c)
    plt.title(title)
    plt.xlabel("Year")
    plt.ylabel(ylabel)
    plt.legend()
    plt.grid(alpha=0.4)
    plt.tight_layout()
    plt.savefig(filename, dpi=300)
    plt.show()
    print(f"Saved: {filename}")

# 7. 三张图（Q2 核心输出）
plot_ratio(
    "I_Y",
    "Investment-to-output ratio (I/Y)",
    "I / Y",
    "Q2_I_over_Y.png"
)

plot_ratio(
    "K_Y",
    "Capital-to-output ratio (K/Y)",
    "K / Y",
    "Q2_K_over_Y.png"
)

plot_ratio(
    "labsh",
    "Labor share of income",
    "Labor share",
    "Q2_labor_share.png"
)
