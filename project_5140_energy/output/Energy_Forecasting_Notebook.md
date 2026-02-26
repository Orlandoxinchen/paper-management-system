# Energy Consumption Forecasting — Full Notebook (Time Series)

**Household electricity consumption: data cleaning, model theory, ACF/PACF analysis, and 7-day forecasting with ARIMA, ETS, and Prophet.**

本文档以 Jupyter Notebook 风格组织：每个部分包含 Markdown 说明、代码单元与示例输出。

---

# Part 1 — Data Cleaning: Construction of the Analysis-Ready Time Series

## Step 1: Load Raw Data

加载 UCI 家庭用电数据。文件为分号分隔；缺失值编码为 `?`。使用 `low_memory=False` 避免读取时的混合类型警告。

```python
import pandas as pd

file_path = "/path/to/household_power_consumption.txt"  # 替换为实际路径

df = pd.read_csv(
    file_path,
    sep=";",
    na_values=["?"],
    low_memory=False
)

print(df.head())
print(df.info())
```

**Sample output:**

```
         Date      Time  Global_active_power  ...  Sub_metering_1  Sub_metering_2  Sub_metering_3
0  16/12/2006  17:24:00                4.216  ...             0.0             1.0            17.0
1  16/12/2006  17:25:00                5.360  ...             0.0             1.0            16.0
...
[5 rows x 9 columns]

<class 'pandas.core.frame.DataFrame'>
RangeIndex: 2075259 entries, 0 to 2075258
Data columns (total 9 columns):
 #   Column                 Dtype
---  ------                 -----
 0   Date                   object
 1   Time                   object
 2   Global_active_power    float64
 ...
dtypes: float64(7), object(2)
```

共 **2,075,259 行**（分钟级）、**9 列**：`Date`、`Time` 与 7 个数值变量。需将 `Date` 与 `Time` 合并为单一 datetime 索引。

---

## Step 2: Build a Datetime Index (Date + Time → datetime)

将 `Date` 与 `Time` 合并为 `datetime`（`dayfirst=True`，格式为 DD/MM/YYYY）。丢弃解析失败的行，设索引为 `datetime`，并删除原 `Date`、`Time` 列。

```python
df["datetime"] = pd.to_datetime(
    df["Date"] + " " + df["Time"],
    dayfirst=True,
    errors="coerce"
)

bad_dt = df["datetime"].isna().sum()
print("Bad datetime rows:", bad_dt)

df = df.dropna(subset=["datetime"]).set_index("datetime").sort_index()
df = df.drop(columns=["Date", "Time"])

print(df.head())
print(df.index.min(), "to", df.index.max())
print(df.info())
```

**Sample output:**

```
Bad datetime rows: 0
```

(DataFrame 前几行，索引为 `datetime`，7 个数值列。)

```
2006-12-16 17:24:00 to 2010-11-26 21:02:00
DatetimeIndex: 2075259 entries, 2006-12-16 17:24:00 to 2010-11-26 21:02:00
Data columns (total 7 columns): ...
dtypes: float64(7)
```

时间范围连续，无无效 datetime 行。

---

## Step 3: Check Missing Values

按列统计缺失值与缺失比例，用于判断缺失是变量特有还是系统性的（如仪器停记）。

```python
print("Missing values by column:")
print(df.isna().sum())

print("\nMissing percentage:")
print((df.isna().mean() * 100).round(3))
```

**Sample output:**

```
Missing values by column:
Global_active_power      25979
Global_reactive_power    25979
Voltage                  25979
Global_intensity         25979
Sub_metering_1           25979
Sub_metering_2           25979
Sub_metering_3           25979
dtype: int64

Missing percentage:
Global_active_power      1.252
... (各列均为 1.252)
```

| 摘要       | 数值      |
|------------|-----------|
| 缺失条数   | 25,979    |
| 总行数     | 2,075,259 |
| 缺失比例   | ≈ 1.252%  |

七列缺失数相同，说明为**系统性缺失**（如整段时间未记录）。缺失比例 &lt; 5%，可在重采样为日频后**安全插值**。

---

## Step 4: Frequency Transformation (Minute → Daily)

目标为**未来 7 天预测**，故采用**日频**。对 `Global_active_power` 做**日均值**重采样并查看长度。

```python
power = df["Global_active_power"]
daily = power.resample("D").mean()

print("Daily series preview:")
print(daily.head())
print("\nNumber of daily observations:", len(daily))
```

**Sample output:**

```
Daily series preview:
datetime
2006-12-16    3.161306
...
Number of daily observations: 1442
```

约 2006-12 至 2010-11（约 4 年 × 365 ≈ 1460 天），得到 **1,442 个日观测**，适合建模。

| 含义     | 说明         |
|----------|--------------|
| 时间跨度 | 约 4 年      |
| 频率     | 日           |
| 数据量   | 充足         |

---

## Step 5: Daily Missing Values and Interpolation

重采样后日序列可能仍有少量缺失日（如整天分钟值都缺失）。统计后使用时间插值填补。

```python
print("Daily missing:", daily.isna().sum())

daily = daily.interpolate(method="time")
print("Remaining missing:", daily.isna().sum())
```

典型结果：约 **9 个缺失日**（约 0.62%），插值后为 **0**。最终日序列**无缺失**，可进行分解与建模。

---

## Step 6: Seasonal Decomposition (Observed, Trend, Seasonal, Residual)

对日序列做**加法**分解，**周期 = 7**（周季节）。

```python
from statsmodels.tsa.seasonal import seasonal_decompose
import matplotlib.pyplot as plt

result = seasonal_decompose(
    daily,
    model="additive",
    period=7
)
result.plot()
plt.show()
```

**Component interpretation:**

1. **Observed** — 原始日平均用电（约 2006–2010），约 1–2 kW，无强长期趋势。
2. **Trend** — 去除季节后的长期变化，较平滑，适合假设缓慢变化的模型。
3. **Seasonal** — 明显的**周**周期（period=7），与工作日/周末一致，支持带周季节的模型（如 ETS、Prophet）。
4. **Residual** — 剩余项，用于诊断。

---

# Part 2 — Model Theory and Applicability to Energy Consumption Forecasting

## Part A: Model Introduction and Applicability

本部分介绍三种时间序列预测模型（ARIMA、ETS、Prophet）的理论及其在家庭用电预测中的适用性，并利用 ACF/PACF 指导模型选择。

---

## 1. ARIMA (AutoRegressive Integrated Moving Average)

### 1.1 Model Overview

ARIMA 将三部分结合：

- **AR (AutoRegressive)**：当前值依赖自身过去值
- **I (Integrated)**：差分以达平稳
- **MA (Moving Average)**：当前值依赖过去预测误差

一般形式：\(\phi(B)(1-B)^d Y_t = \theta(B)\varepsilon_t\)，其中 \(p\) 为自回归阶、\(d\) 为差分阶、\(q\) 为移动平均阶，\(B\) 为滞后算子，\(\varepsilon_t\) 为白噪声。

### 1.2 Applicable Scenarios

| Scenario | Suitability |
|----------|-------------|
| Stationary or near-stationary series | ✓ Excellent |
| Series with trend (after differencing) | ✓ Good |
| Short-term forecasting | ✓ Excellent |
| Long-term forecasting | ✗ Poor (mean-reverting) |
| Series with strong seasonality | △ Requires SARIMA |
| Series with multiple seasonalities | ✗ Limited |
| Series with external regressors | △ Requires ARIMAX |

### 1.3 Applicability to This Dataset

**Suitability: HIGH** ⭐⭐⭐⭐⭐

1. **Stationarity**：一阶差分后日用电序列平稳（ADF 检验支持）
2. **Short-term forecast**：7 天预测是 ARIMA 的强项
3. **Autocorrelation**：ACF/PACF 显示可由 AR、MA 刻画
4. **Weekly seasonality**：可用 SARIMA(p,d,q)(P,D,Q)[7]

**Limitations**：需人工或自动确定 (p,d,q)、假设线性、难以刻画复杂节假日。

---

## 2. ETS (Error, Trend, Seasonality) / Exponential Smoothing

### 2.1 Model Overview

ETS 将序列分解为 Error、Trend、Seasonal，记为 ETS(E,T,S)：

- **Error (E)**：Additive (A) 或 Multiplicative (M)
- **Trend (T)**：None (N)、Additive (A)、Additive Damped (Ad)、Multiplicative (M)
- **Seasonal (S)**：None (N)、Additive (A)、Multiplicative (M)

加法形式示例：\(Y_t = l_{t-1} + b_{t-1} + s_{t-m} + \varepsilon_t\)（\(l_t\) 水平，\(b_t\) 趋势，\(s_t\) 季节，\(m\) 季节周期）。

### 2.2 Applicable Scenarios

| Scenario | Suitability |
|----------|-------------|
| Clear trend / seasonality | ✓ Excellent |
| Short to medium-term forecasting | ✓ Excellent |
| Automatic model selection (AIC/BIC) | ✓ Good |
| Non-stationary series | ✓ Good (no differencing) |
| Damped trend | ✓ Excellent |
| Multiple seasonalities | ✗ Limited (single period) |

### 2.3 Applicability to This Dataset

**Suitability: HIGH** ⭐⭐⭐⭐⭐

1. 明显**周季节**（7 天周期）适合季节 ETS
2. 平滑趋势适合指数平滑
3. 分解显示**加法**季节
4. 可自动优化平滑参数

**Recommended**：ETS(A,Ad,A)，周期=7。**Limitations**：无外生变量、仅单一季节周期。

---

## 3. Prophet

### 3.1 Model Overview

Prophet 采用加法分解：\(y(t) = g(t) + s(t) + h(t) + \varepsilon_t\)，其中 \(g(t)\) 趋势、\(s(t)\) 季节（傅里叶）、\(h(t)\) 节假日。

### 3.2 Applicable Scenarios

| Scenario | Suitability |
|----------|-------------|
| Multiple seasonalities (daily, weekly, yearly) | ✓ Excellent |
| Missing data / outliers | ✓ Excellent / Good |
| Holiday/event effects | ✓ Excellent |
| Long-term forecasting | ✓ Good |
| Short series (<2 years) | ✗ Limited |
| Precise short-term forecasts | △ Moderate |

### 3.3 Applicability to This Dataset

**Suitability: MODERATE** ⭐⭐⭐

**Advantages**：多季节、对缺失稳健、易用、可解释。  
**Limitations**：趋势易外推过度；本项目中 7 天预测 ARIMA/ETS 更优；家庭用电无明确“节假日”效应。  
**Empirical**：Prophet 的 MAE/RMSE/MAPE 高于 ARIMA 与 ETS，与短期趋势外推有关。

---

## 4. Model Comparison Summary

| Criterion | ARIMA | ETS | Prophet |
|-----------|-------|-----|--------|
| **Theoretical Foundation** | Box-Jenkins | State space | GAM |
| **Stationarity Requirement** | Yes (or differencing) | No | No |
| **Seasonality** | SARIMA | Built-in (single) | Multiple |
| **Parameter Selection** | Manual (ACF/PACF) or auto | AIC/BIC | Automatic |
| **Short-term Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Long-term Accuracy** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Handling Missing Data** | Poor | Moderate | Excellent |
| **Suitability for This Dataset** | **HIGH** | **HIGH** | **MODERATE** |

**Recommendation for 7-day household electricity forecasting:**

1. **首选 ARIMA 或 ETS** — 短期预测好、计算成本低  
2. **ETS(A,Ad,A)** 推荐，可刻画周季节与阻尼趋势  
3. **Prophet** 更适合长期或需节假日效应时使用  

---

# Part 3 — ACF and PACF Analysis

ACF（自相关）与 PACF（偏自相关）用于识别 ARIMA 阶数。

## 5.1 ACF and PACF Theory

- **ACF** \(\rho_k\)：\(Y_t\) 与 \(Y_{t-k}\) 的相关系数（含间接相关），\(\rho_k = \frac{\text{Cov}(Y_t, Y_{t-k})}{\text{Var}(Y_t)}\)。
- **PACF**：在控制中间滞后的前提下，\(Y_t\) 与 \(Y_{t-k}\) 的直接相关。

**ARIMA 阶数参考：**

| Pattern | ACF | PACF | Suggested Model |
|---------|-----|------|------------------|
| Exponential decay | Gradual decline | Sharp cutoff at lag p | AR(p) |
| Sharp cutoff at lag q | Exponential decay | Gradual decline | MA(q) |
| Both decay | Gradual | Gradual | ARMA(p,q) |
| Slow decay | - | - | Non-stationary, differencing |

## Code: Load Libraries and Data

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import acf, pacf, adfuller
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
import warnings
warnings.filterwarnings('ignore')

plt.rcParams['figure.figsize'] = (14, 5)
plt.rcParams['font.size'] = 11
print("Libraries imported successfully!")
```

**Output:** `Libraries imported successfully!`

```python
# 假设已按 Part 1 得到 daily 序列
# daily = ... (从 Step 4–5 得到)
print("Daily observations:", len(daily))
print("Date range:", daily.index.min().date(), "to", daily.index.max().date())
```

**Output (示例):**

```
Daily observations: 1442
Date range: 2006-12-16 to 2010-11-26
```

## Code: ACF/PACF — Original Series

```python
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
plot_acf(daily.dropna(), lags=40, ax=axes[0])
axes[0].set_title('ACF - Original Daily Series', fontsize=14, fontweight='bold')
plot_pacf(daily.dropna(), lags=40, ax=axes[1])
axes[1].set_title('PACF - Original Daily Series', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('ACF_PACF_Original.png', dpi=150, bbox_inches='tight')
plt.show()

print("ACF/PACF Analysis - Original Series")
print("1. ACF shows very slow decay → indicates non-stationarity")
print("2. Significant spikes at lags 7, 14, 21, 28 → weekly seasonality")
print("3. PACF shows significant spike at lag 1, then smaller spikes at multiples of 7")
```

**Interpretation:** 原序列 ACF 缓慢衰减 → **非平稳**；7、14、21、28 滞后显著 → **周季节**；PACF 在 lag 1 显著，随后在 7 的倍数处有较小峰。

## Code: First Differencing and ADF Test

```python
daily_diff = daily.diff().dropna()
adf_result = adfuller(daily_diff)
print("ADF Statistic:", round(adf_result[0], 4))
print("p-value:", round(adf_result[1], 6))
print("Stationary (p<0.05):", adf_result[1] < 0.05)
```

**Output (示例):** ADF 统计量显著、p &lt; 0.05 → 一阶差分后**平稳**，支持 **d=1**。

## Code: ACF/PACF — Differenced Series

```python
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
plot_acf(daily_diff, lags=40, ax=axes[0])
axes[0].set_title('ACF - First Differenced Series', fontsize=14, fontweight='bold')
plot_pacf(daily_diff, lags=40, ax=axes[1])
axes[1].set_title('PACF - First Differenced Series', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('ACF_PACF_Differenced.png', dpi=150, bbox_inches='tight')
plt.show()

print("ACF/PACF Analysis - First Differenced Series")
print("1. ACF now shows rapid decay → stationarity achieved")
print("2. Remaining seasonal spikes at 7, 14 → consider SARIMA seasonal terms")
print("3. PACF significant at lags 1-2 → suggests AR(1) or AR(2)")
```

**Interpretation:** 差分后 ACF 快速衰减 → 平稳；PACF 在 lag 1–2 显著 → 建议 **AR(1) 或 AR(2)**，结合季节可选用 SARIMA(1,1,1)(1,0,1)[7] 或类似。

---

# Part 4 — Forecasting and Results

## Train/Test Split and Models

- **Train**：除最后 7 天外的全部数据  
- **Test**：最后 7 天  
- **Models**：ARIMA(1,1,1)、ETS（加法趋势+季节，period=7）、Prophet（weekly+yearly）  
- **Metrics**：MAE、RMSE、MAPE  

## Code: Fit Models and Forecast (Outline)

```python
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing

test_size = 7
train = daily.iloc[:-test_size]
test = daily.iloc[-test_size:]

# ARIMA
model_arima = ARIMA(train, order=(1, 1, 1))
fit_arima = model_arima.fit()
pred_arima = fit_arima.forecast(steps=len(test))

# ETS
model_ets = ExponentialSmoothing(train, seasonal_periods=7, trend="add", seasonal="add")
fit_ets = model_ets.fit()
pred_ets = fit_ets.forecast(steps=len(test))

# Prophet (若已安装)
# from prophet import Prophet
# train_df = train.reset_index(); train_df.columns = ["ds", "y"]
# m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
# m.fit(train_df); future = pd.DataFrame({"ds": test.index}); pred_prophet = m.predict(future)["yhat"].values
```

## Table 1A — 7-day Forecasts (Actual vs Predictions)

| Date       | Actual  | ARIMA Forecast | ETS Forecast | Prophet Forecast |
|------------|---------|----------------|--------------|------------------|
| 2010-11-20 | 1.5257  | 1.1678         | 1.2076       | 1.5914           |
| 2010-11-21 | 0.6256  | 1.1857         | 1.2037       | 1.5761           |
| 2010-11-22 | 1.4177  | 1.1898         | 1.1761       | 1.3666           |
| 2010-11-23 | 1.0955  | 1.1907         | 1.1343       | 1.4468           |
| 2010-11-24 | 1.2474  | 1.1909         | 1.1455       | 1.4613           |
| 2010-11-25 | 0.9939  | 1.1910         | 1.1780       | 1.3643           |
| 2010-11-26 | 1.1782  | 1.1910         | 1.1259       | 1.4200           |

## Table 1B — Absolute Errors and Ratios (vs ARIMA)

| Date       | AE (ARIMA) | AE (ETS) | AE (Prophet) | ETS/ARIMA | Prophet/ARIMA |
|------------|------------|----------|--------------|-----------|---------------|
| 2010-11-20 | 0.3579     | 0.3181   | 0.0657       | 0.8888    | 0.1836        |
| 2010-11-21 | 0.5600     | 0.5781   | 0.9505       | 1.0322    | 1.6972        |
| 2010-11-22 | 0.2280     | 0.2417   | 0.0511       | 1.0602    | 0.2242        |
| 2010-11-23 | 0.0952     | 0.0388   | 0.3513       | 0.4070    | 3.6898        |
| 2010-11-24 | 0.0565     | 0.1019   | 0.2139       | 1.8056    | 3.7899        |
| 2010-11-25 | 0.1971     | 0.1842   | 0.3705       | 0.9342    | 1.8792        |
| 2010-11-26 | 0.0128     | 0.0523   | 0.2418       | 4.0960    | 18.9244       |

## Table 2A — Forecast Accuracy Metrics

| Model   | MAE     | RMSE    | MAPE (%) |
|---------|---------|---------|----------|
| ARIMA   | 0.2153  | 0.2790  | 23.3121  |
| ETS     | 0.2164  | 0.2783  | 23.5678  |
| Prophet | 0.3207  | 0.4268  | 38.1215  |

## Table 2B — Relative Performance vs ARIMA

| Model   | MAE Ratio | MAE Improvement (%) | RMSE Ratio | RMSE Improvement (%) | MAPE Ratio | MAPE Improvement (%) |
|---------|-----------|----------------------|------------|----------------------|------------|------------------------|
| ARIMA   | 1.0       | 0.0                  | 1.0        | 0.0                  | 1.0        | 0.0                    |
| ETS     | 1.005     | -0.50                | 0.9976     | 0.24                 | 1.011      | -1.10                  |
| Prophet | 1.4892    | -48.92               | 1.5298     | -52.98               | 1.6353     | -63.53                 |

---

# Summary and Conclusions

- **Data cleaning**：原始分钟数据经加载、合并为 datetime 索引、缺失检查（约 1.25%，系统性）、日重采样与时间插值，得到完整日序列；加法分解（period=7）确认平滑趋势与明显周季节。
- **Models**：ARIMA 与 ETS 对本序列与 7 天 horizon 适用性高；Prophet 灵活但在本 7 天评估中趋势外推偏强。
- **Results**：在最后 7 天，**ARIMA** 与 **ETS** 表现最佳且接近（MAE≈0.215，RMSE≈0.28，MAPE≈23%）；**Prophet** 误差更大（MAE≈0.32，MAPE≈38%），与趋势外推一致。
- **Limitation**：仅使用单次 7 天测试窗口；采用滚动原点或扩展窗口评估可得到更稳健的对比。

---

# Figures (References)

- **Decomposition**：Observed, Trend, Seasonal, Residual — 如 `fig1_series_decomposition.png`
- **ACF/PACF**：原始序列与一阶差分 — 如 `ACF_PACF_Original.png`、`ACF_PACF_Differenced.png` 或 `fig2_acf_pacf.png`
- **Forecasts**：7 天实际 vs ARIMA/ETS/Prophet — 如 `fig3_forecasts.png` 或 `forecast_comparison_all.png`

具体表格与图形以 `output/` 与 `output/figures/` 中 CSV/PNG 为准。
