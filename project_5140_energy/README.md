# 📊 Energy Consumption Forecasting — 5140 Project (Time Series)

**Household electricity consumption: 7-day ahead forecasting with ARIMA, ETS, and Prophet.**

---

## 🔗 Quick Links (作业展示入口)

| 内容 | 链接（相对路径，推送到 GitHub 后自动生效） |
|------|------|
| **📓 完整 Notebook（数据清洗+模型理论+ACF/PACF+预测，推荐）** | [**Energy_Forecasting_Notebook.md**](output/Energy_Forecasting_Notebook.md) |
| **📄 报告（仅表格+结论）** | [**FORECAST_REPORT.md**](output/FORECAST_REPORT.md) |
| **📁 本作业目录** | [project_5140_energy](.) |
| **📂 仓库首页** | [仓库根目录](../) |
| **📈 分解图** | [fig1_series_decomposition.png](output/figures/fig1_series_decomposition.png) |
| **📈 ACF/PACF** | [fig2_acf_pacf.png](output/figures/fig2_acf_pacf.png) |
| **📈 预测对比图** | [fig3_forecasts.png](output/figures/fig3_forecasts.png) |
| **📝 Word 报告** | [Energy_Consumption_Forecasting_Report.docx](Energy_Consumption_Forecasting_Report.docx) |

---

## 📋 Overview

- **Data:** UCI Household Electric Power Consumption (minute → **daily**)
- **Target:** `Global_active_power` (kW), **7-day ahead** forecast
- **Models:** ARIMA, ETS (Holt–Winters), Prophet
- **Metrics:** MAE, RMSE, MAPE; trend & seasonal (weekly) analysis

---

## 📂 File Structure

```
project_5140_energy/
├── README.md                    ← 本说明（含展示链接）
├── energy_forecast.py           ← 主脚本：数据、建模、预测、出图
├── generate_report_docx.py      ← 生成 Word 报告
├── requirements.txt
├── Energy_Consumption_Forecasting_Report.docx
└── output/
    ├── Energy_Forecasting_Notebook.md  ← ⭐ 完整 Notebook（清洗+理论+ACF/PACF+预测）
    ├── FORECAST_REPORT.md              ← 表格+结论（GitHub 直接预览）
    ├── evaluation_table.csv
    ├── results.json
    └── figures/
        ├── fig1_series_decomposition.png
        ├── fig2_acf_pacf.png
        └── fig3_forecasts.png
```

---

## 🚀 How to Run

```bash
cd project_5140_energy
pip install -r requirements.txt
```

**With your own UCI data:**

```bash
export ENERGY_DATA="/path/to/household_power_consumption.txt"
python energy_forecast.py
python generate_report_docx.py
```

**Without `ENERGY_DATA`:** script uses built-in synthetic daily data so the pipeline runs end-to-end.

---

## 📊 Results Summary

- **Table 1A/1B:** 7-day forecasts and absolute errors (vs ARIMA ratios).
- **Table 2A/2B:** MAE, RMSE, MAPE and relative performance.
- **Conclusion:** ARIMA and ETS perform best for this 7-day horizon; Prophet over-extrapolates trend.

👉 Full tables and discussion: **[FORECAST_REPORT.md](output/FORECAST_REPORT.md)**

---

## 📎 Data Source

- [UCI Electric Power Consumption (Kaggle)](https://www.kaggle.com/datasets/uciml/electric-power-consumption-data-set)  
- Format: `Date;Time;Global_active_power;...` (missing = `?`). Script resamples to daily mean.
