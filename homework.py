import pandas as pd
import matplotlib.pyplot as plt

file_path = "/Users/orlando-alex/Downloads/mpd2020.xlsx"

# 1) 读取 Full Data sheet
df = pd.read_excel(file_path, sheet_name="Full data")

# 2) 看看列名是否包含 countrycode/year/gdppc
print(df.columns)

countries = ["USA", "GBR", "CHN"]

df1 = (
    df.query("countrycode in @countries and year >= 1500")
      .loc[:, ["year", "countrycode", "gdppc"]]
      .dropna()
)

# 图1：三国对比
plt.figure(figsize=(10,6))
for c in countries:
    temp = df1[df1["countrycode"] == c]
    plt.plot(temp["year"], temp["gdppc"], label=c)

plt.xlabel("Year")
plt.ylabel("GDP per capita (gdppc)")
plt.title("Maddison Project: GDP per capita since 1500")
plt.legend()
plt.show()

# 图2：中国单独
df_china = df1[df1["countrycode"] == "CHN"]

plt.figure(figsize=(10,6))
plt.plot(df_china["year"], df_china["gdppc"])
plt.xlabel("Year")
plt.ylabel("GDP per capita (gdppc)")
plt.title("Maddison Project: China GDP per capita since 1500")
plt.show()
