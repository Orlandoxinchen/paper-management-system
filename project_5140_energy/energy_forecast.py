# -*- coding: utf-8 -*-
"""
5140 Midterm — Project Option 4: Energy Consumption Forecasting (Time Series)
- Load UCI/Kaggle household power data (minute → daily aggregation)
- Target: Global_active_power (kW); forecast horizon: 1 week (7 days) ahead
- Models: ARIMA, ETS (Holt-Winters), Prophet
- Compare MAE, RMSE, MAPE; analyze trend and seasonality
"""
import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# ============== CONFIG ==============
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "output")
FIG_DIR = os.path.join(OUT_DIR, "figures")
# Set ENERGY_DATA to path of household_power_consumption.txt or similar CSV
DATA_PATH = os.environ.get("ENERGY_DATA", "")
# Alternative: hourly CSV (e.g. PJME_hourly) with 'datetime' and 'MW' or 'Global_active_power'
SEED = 42
FORECAST_HORIZON_DAYS = 7  # 1-week ahead
np.random.seed(SEED)
os.makedirs(FIG_DIR, exist_ok=True)

# ============== 1) LOAD & AGGREGATE ==============
def load_and_aggregate():
    """Load UCI/Kaggle power data or generic CSV; aggregate to daily; return series."""
    if DATA_PATH and os.path.isfile(DATA_PATH):
        try:
            # UCI format: Date;Time;Global_active_power;...
            sep = ";" if open(DATA_PATH).read(500).count(";") > 2 else ","
            df = pd.read_csv(DATA_PATH, sep=sep, na_values=["?", "nan", ""], low_memory=False)
            df.columns = [c.strip() for c in df.columns]
            # Find datetime and power column
            date_col = None
            for c in df.columns:
                if "date" in c.lower() and "time" in c.lower():
                    date_col = c
                    break
                if "date" in c.lower():
                    date_col = c
            if date_col is None and len(df.columns) >= 2:
                date_col = df.columns[0]
            power_col = None
            for c in df.columns:
                if "global_active" in c.lower() or "active_power" in c.lower():
                    power_col = c
                    break
                if "consumption" in c.lower() or "power" in c.lower() or "mw" in c.lower():
                    power_col = c
            if power_col is None and len(df.columns) >= 2:
                power_col = df.columns[2] if "Global" in str(df.columns[2]) else df.columns[1]
            df = df[[date_col, power_col]].copy()
            df = df.dropna()
            df[power_col] = pd.to_numeric(df[power_col], errors="coerce")
            df = df.dropna()
            # Parse datetime: "16/12/2006;17:24:00" or "2006-12-16 17:24:00"
            raw = df[date_col].astype(str)
            if ";" in raw.iloc[0]:
                df["dt"] = pd.to_datetime(raw.str.replace(";", " ", regex=False), format="mixed", dayfirst=True)
            else:
                df["dt"] = pd.to_datetime(raw)
            df = df.set_index("dt").sort_index()
            ts = df[power_col].resample("D").mean()
            ts = ts.dropna()
            ts.name = "Global_active_power_kW"
            if len(ts) < 30:
                raise ValueError("After aggregation, fewer than 30 days; use longer series or synthetic.")
            return ts
        except Exception as e:
            print("Load from file failed:", e)
    # Synthetic: daily household power (2 years), trend + weekly + noise
    n = 730
    t = np.arange(n, dtype=float)
    trend = 1.2 + 0.0003 * t
    weekly = 0.15 * np.sin(2 * np.pi * t / 7) + 0.08 * np.cos(2 * np.pi * t / 7)
    noise = np.random.normal(0, 0.05, n)
    y = trend + weekly + noise
    y = np.maximum(y, 0.5)
    dates = pd.date_range(start="2022-01-01", periods=n, freq="D")
    ts = pd.Series(y, index=dates, name="Global_active_power_kW")
    return ts

ts = load_and_aggregate()
ts = ts.astype(float)

# Train/test: last 7 days = test (1-week ahead forecast)
test_size = FORECAST_HORIZON_DAYS
train = ts.iloc[:-test_size]
test = ts.iloc[-test_size:]

# ============== 2) EDA & STATIONARITY ==============
adf_result = adfuller(train.dropna())
adf_stat = float(adf_result[0])
adf_pval = float(adf_result[1])

period_seasonal = 7  # weekly for daily data
try:
    decomp = seasonal_decompose(train, model="additive", period=min(period_seasonal, len(train)//2 - 1 or 7))
except Exception:
    decomp = None

# ============== 3) FIGURES: EDA ==============
fig, axes = plt.subplots(3, 1, figsize=(10, 8), sharex=True)
axes[0].plot(train.index, train.values, color="steelblue", linewidth=0.8)
axes[0].set_ylabel("Power (kW)")
axes[0].set_title("Household Energy Consumption — Training (Daily)")
axes[0].grid(True, alpha=0.3)
if decomp is not None:
    axes[1].plot(train.index, decomp.trend.values, color="green", linewidth=0.8)
    axes[1].set_ylabel("Trend")
    axes[1].grid(True, alpha=0.3)
    axes[2].plot(train.index, decomp.seasonal.values, color="orange", linewidth=0.8)
    axes[2].set_ylabel("Seasonal")
    axes[2].grid(True, alpha=0.3)
plt.suptitle("Time Series Decomposition (Trend & Seasonality)")
plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, "fig1_series_decomposition.png"), dpi=150, bbox_inches="tight")
plt.close()

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
lags = min(50, len(train)//2 - 1)
plot_acf(train.dropna(), lags=lags, ax=axes[0])
axes[0].set_title("ACF")
plot_pacf(train.dropna(), lags=min(30, lags), ax=axes[1])
axes[1].set_title("PACF")
plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, "fig2_acf_pacf.png"), dpi=150, bbox_inches="tight")
plt.close()

# ============== 4) METRICS ==============
def rmse(y_true, y_pred):
    return float(np.sqrt(np.mean((np.asarray(y_true) - np.asarray(y_pred)) ** 2)))
def mae(y_true, y_pred):
    return float(np.mean(np.abs(np.asarray(y_true) - np.asarray(y_pred))))
def mape(y_true, y_pred):
    y_t, y_p = np.asarray(y_true), np.asarray(y_pred)
    mask = np.abs(y_t) > 1e-6
    if mask.sum() == 0:
        return np.nan
    return float(np.mean(np.abs((y_t[mask] - y_p[mask]) / y_t[mask])) * 100)

# ============== 5) MODELS — ARIMA, ETS, Prophet ==============
order_arima = (1, 1, 1)
seasonal_order_sarima = (1, 0, 1, 7)  # weekly seasonality for daily data

pred_arima = np.full(len(test), np.nan)
rmse_arima = mae_arima = mape_arima = np.nan
fit_arima = None
try:
    model_arima = ARIMA(train, order=order_arima)
    fit_arima = model_arima.fit()
    pred_arima = fit_arima.forecast(steps=len(test))
    rmse_arima = rmse(test, pred_arima)
    mae_arima = mae(test, pred_arima)
    mape_arima = mape(test, pred_arima)
except Exception as e:
    print("ARIMA failed:", e)

pred_ets = np.full(len(test), np.nan)
rmse_ets = mae_ets = mape_ets = np.nan
fit_ets = None
try:
    model_ets = ExponentialSmoothing(
        train, seasonal_periods=7, trend="add", seasonal="add"
    )
    fit_ets = model_ets.fit()
    pred_ets = fit_ets.forecast(steps=len(test))
    rmse_ets = rmse(test, pred_ets)
    mae_ets = mae(test, pred_ets)
    mape_ets = mape(test, pred_ets)
except Exception as e:
    print("ETS failed:", e)

pred_prophet = np.full(len(test), np.nan)
rmse_prophet = mae_prophet = mape_prophet = np.nan
try:
    from prophet import Prophet
    train_df = train.reset_index()
    train_df.columns = ["ds", "y"]
    m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    m.fit(train_df)
    future = pd.DataFrame({"ds": test.index})
    fcst = m.predict(future)
    pred_prophet = fcst["yhat"].values
    rmse_prophet = rmse(test, pred_prophet)
    mae_prophet = mae(test, pred_prophet)
    mape_prophet = mape(test, pred_prophet)
except ImportError:
    print("Prophet not installed; skip. pip install prophet")
except Exception as e:
    print("Prophet failed:", e)

# ============== 6) FORECAST PLOT (7-day ahead) ==============
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(train.index[-60:], train.values[-60:], label="Train (last 60 days)", color="steelblue", alpha=0.8)
ax.plot(test.index, test.values, label="Actual (7-day test)", color="black", linewidth=2, marker="o")
if fit_arima is not None:
    ax.plot(test.index, pred_arima, label="ARIMA (7-day ahead)", linestyle="--", color="green", marker="s")
if fit_ets is not None:
    ax.plot(test.index, pred_ets, label="ETS (7-day ahead)", linestyle="--", color="red", marker="^")
if not np.isnan(pred_prophet).all():
    ax.plot(test.index, pred_prophet, label="Prophet (7-day ahead)", linestyle="--", color="orange", marker="d")
ax.set_xlabel("Date")
ax.set_ylabel("Global Active Power (kW)")
ax.set_title("Energy Consumption: 1-Week Ahead Forecast vs Actual")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(FIG_DIR, "fig3_forecasts.png"), dpi=150, bbox_inches="tight")
plt.close()

# ============== 7) SAVE RESULTS ==============
results = {
    "n_obs": int(len(ts)),
    "n_train": int(len(train)),
    "n_test": int(len(test)),
    "forecast_horizon_days": FORECAST_HORIZON_DAYS,
    "adf_statistic": round(adf_stat, 4),
    "adf_pvalue": round(adf_pval, 4),
    "train_mean": round(float(train.mean()), 4),
    "train_std": round(float(train.std()), 4),
    "arima_rmse": round(rmse_arima, 4) if not np.isnan(rmse_arima) else None,
    "arima_mae": round(mae_arima, 4) if not np.isnan(mae_arima) else None,
    "arima_mape": round(mape_arima, 4) if not np.isnan(mape_arima) else None,
    "ets_rmse": round(rmse_ets, 4) if not np.isnan(rmse_ets) else None,
    "ets_mae": round(mae_ets, 4) if not np.isnan(mae_ets) else None,
    "ets_mape": round(mape_ets, 4) if not np.isnan(mape_ets) else None,
    "prophet_rmse": round(rmse_prophet, 4) if not np.isnan(rmse_prophet) else None,
    "prophet_mae": round(mae_prophet, 4) if not np.isnan(mae_prophet) else None,
    "prophet_mape": round(mape_prophet, 4) if not np.isnan(mape_prophet) else None,
}
with open(os.path.join(OUT_DIR, "results.json"), "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

eval_rows = [
    ("ARIMA(1,1,1)", results["arima_rmse"], results["arima_mae"], results["arima_mape"]),
    ("ETS (Holt-Winters)", results["ets_rmse"], results["ets_mae"], results["ets_mape"]),
    ("Prophet", results["prophet_rmse"], results["prophet_mae"], results["prophet_mape"]),
]
eval_df = pd.DataFrame(eval_rows, columns=["Model", "RMSE", "MAE", "MAPE (%)"])
eval_df.to_csv(os.path.join(OUT_DIR, "evaluation_table.csv"), index=False)

print("Results saved to", OUT_DIR)
print("Forecast horizon: 7 days (1 week) ahead")
print(json.dumps(results, indent=2))
