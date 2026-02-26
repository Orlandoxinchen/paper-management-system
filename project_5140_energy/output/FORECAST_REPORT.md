# Energy Consumption Forecasting Report

## Table 1A — 7-day Forecasts (Actual vs Predictions)

| Date | Actual | ARIMA Forecast | ETS Forecast | Prophet Forecast |
| --- | --- | --- | --- | --- |
| 2010-11-20 | 1.5257 | 1.1678 | 1.2076 | 1.5914 |
| 2010-11-21 | 0.6256 | 1.1857 | 1.2037 | 1.5761 |
| 2010-11-22 | 1.4177 | 1.1898 | 1.1761 | 1.3666 |
| 2010-11-23 | 1.0955 | 1.1907 | 1.1343 | 1.4468 |
| 2010-11-24 | 1.2474 | 1.1909 | 1.1455 | 1.4613 |
| 2010-11-25 | 0.9939 | 1.191 | 1.178 | 1.3643 |
| 2010-11-26 | 1.1782 | 1.191 | 1.1259 | 1.42 |

## Table 1B — Absolute Errors and Relative Ratios (vs ARIMA)

| Date | AE (ARIMA) | AE (ETS) | AE (Prophet) | ETS / ARIMA | Prophet / ARIMA |
| --- | --- | --- | --- | --- | --- |
| 2010-11-20 | 0.3579 | 0.3181 | 0.0657 | 0.8888 | 0.1836 |
| 2010-11-21 | 0.56 | 0.5781 | 0.9505 | 1.0322 | 1.6972 |
| 2010-11-22 | 0.228 | 0.2417 | 0.0511 | 1.0602 | 0.2242 |
| 2010-11-23 | 0.0952 | 0.0388 | 0.3513 | 0.407 | 3.6898 |
| 2010-11-24 | 0.0565 | 0.1019 | 0.2139 | 1.8056 | 3.7899 |
| 2010-11-25 | 0.1971 | 0.1842 | 0.3705 | 0.9342 | 1.8792 |
| 2010-11-26 | 0.0128 | 0.0523 | 0.2418 | 4.096 | 18.9244 |

## Table 2A — Forecast Accuracy Metrics

| Model | MAE | RMSE | MAPE (%) |
| --- | --- | --- | --- |
| ARIMA | 0.2153 | 0.279 | 23.3121 |
| ETS | 0.2164 | 0.2783 | 23.5678 |
| Prophet | 0.3207 | 0.4268 | 38.1215 |

## Table 2B — Relative Performance Compared with ARIMA

| Model | MAE Ratio | MAE Improvement (%) | RMSE Ratio | RMSE Improvement (%) | MAPE Ratio | MAPE Improvement (%) |
| --- | --- | --- | --- | --- | --- | --- |
| ARIMA | 1.0 | 0.0 | 1.0 | 0.0 | 1.0 | 0.0 |
| ETS | 1.005 | -0.5027 | 0.9976 | 0.2422 | 1.011 | -1.0967 |
| Prophet | 1.4892 | -48.916 | 1.5298 | -52.9766 | 1.6353 | -63.5265 |

---

## Summary and Observations

From the forecast values and error metrics, **ARIMA** performs best over the 7-day test window: its forecasts are stable and track the actual levels closely. **ETS** is nearly on par with ARIMA, with only minor differences, indicating that both traditional smoothing/autoregressive approaches are well suited for short-horizon forecasting of this series. In contrast, **Prophet** tends to over-predict, with a clear tendency to over-extrapolate the trend, which leads to larger errors. This suggests that for short-horizon tasks, model complexity does not necessarily improve accuracy, and simpler, stable models can perform better.

**Limitation:** This evaluation uses a single 7-day test window. Rankings could change under longer horizons or rolling-origin evaluation. Future work could apply rolling-origin or expanding-window assessment to obtain more robust performance comparisons.
