# 5140 Midterm — Project Option 4: Energy Consumption Forecasting (Time Series)

## 与 Midterm_Project_Starter 一致

- **数据**: Kaggle UCI household electric power consumption（分钟级 → 聚合为**日度**）
- **预测变量**: `Global_active_power`（家庭总有功功率，kW）
- **预测 horizon**: **1 周（7 天）** 提前预测
- **模型**: ARIMA、ETS (Holt-Winters)、Prophet
- **评估**: MAE、RMSE、MAPE；趋势与季节（日/周）分析

## 文件

- **energy_forecast.py** — 加载/聚合数据、EDA、拟合 ARIMA/ETS/Prophet、7 日预测、保存结果与图
- **generate_report_docx.py** — 根据结果生成 Word 报告
- **output/results.json**、**output/figures/** — 分析结果与图
- **Energy_Consumption_Forecasting_Report.docx** — 最终报告（运行后生成）

## 数据来源

- UCI: https://www.kaggle.com/datasets/uciml/electric-power-consumption-data-set  
- 备选（小时）: https://www.kaggle.com/datasets/robikscube/hourly-energy-consumption  

UCI 数据格式：`Date;Time;Global_active_power;...`（缺失为 `?`）。脚本会识别并聚合成日度。

## 运行

```bash
cd project_5140_energy
pip install -r requirements.txt
```

**使用自己的数据**（下载好的 UCI 或小时级 CSV）：

```bash
export ENERGY_DATA="/path/to/household_power_consumption.txt"
python energy_forecast.py
python generate_report_docx.py
```

**不设置 `ENERGY_DATA`**：脚本使用内置生成的 2 年日度合成数据，可直接跑通并出报告。

报告路径：**Energy_Consumption_Forecasting_Report.docx**
