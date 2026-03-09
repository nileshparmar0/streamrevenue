import * as ss from 'simple-statistics';
import { getRevenueHistory } from './database';

export interface PredictionResult {
  predictedRevenue: number;
  predictedSubscribers: number;
  predictedBits: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  forecast: Array<{
    date: string;
    predicted: number;
    lower: number;
    upper: number;
  }>;
  insights: string[];
}

/**
 * Calculate linear regression for time series
 */
function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  if (data.length < 2) {
    return { slope: 0, intercept: data[0] || 0, r2: 0 };
  }

  const xValues = data.map((_, i) => i);
  const regression = ss.linearRegression(xValues.map((x, i) => [x, data[i]]));
  const regressionLine = ss.linearRegressionLine(regression);
  
  // Calculate R-squared
  const predictions = xValues.map(x => regressionLine(x));
  const meanY = ss.mean(data);
  const ssTotal = ss.sum(data.map(y => Math.pow(y - meanY, 2)));
  const ssResidual = ss.sum(data.map((y, i) => Math.pow(y - predictions[i], 2)));
  const r2 = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

  return {
    slope: regression.m,
    intercept: regression.b,
    r2: Math.max(0, Math.min(1, r2))
  };
}

/**
 * Calculate moving average
 */
function movingAverage(data: number[], window: number): number[] {
  if (data.length < window) return data;
  
  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    const slice = data.slice(i - window + 1, i + 1);
    result.push(ss.mean(slice));
  }
  return result;
}

/**
 * Detect seasonality (weekly patterns)
 */
function detectWeeklyPattern(data: number[]): number[] {
  if (data.length < 14) return new Array(7).fill(1);
  
  const weeklyFactors = new Array(7).fill(0);
  const weeklyCount = new Array(7).fill(0);
  
  data.forEach((value, index) => {
    const dayOfWeek = index % 7;
    weeklyFactors[dayOfWeek] += value;
    weeklyCount[dayOfWeek]++;
  });
  
  const avgTotal = ss.mean(data) || 1;
  return weeklyFactors.map((sum, i) => 
    weeklyCount[i] > 0 ? (sum / weeklyCount[i]) / avgTotal : 1
  );
}

/**
 * Generate revenue predictions
 */
export async function generatePredictions(
  userId: string,
  daysToPredict: number = 30
): Promise<PredictionResult> {
  // Get historical data
  const history = await getRevenueHistory(userId, 90);
  
  // If no history, return default predictions
  if (!history || history.length === 0) {
    return generateDefaultPrediction(daysToPredict);
  }

  // Sort by date ascending
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Extract revenue data
  const revenueData = sortedHistory.map(h => parseFloat(h.total_revenue) || 0);
  const subData = sortedHistory.map(h => parseInt(h.subscriber_count) || 0);
  const bitsData = sortedHistory.map(h => parseInt(h.bits_total) || 0);

  // Calculate trends using linear regression
  const revenueRegression = linearRegression(revenueData);
  const subRegression = linearRegression(subData);
  
  // Calculate moving averages for smoothing
  const revenueMA = movingAverage(revenueData, 7);
  const currentAvg = revenueMA.length > 0 ? revenueMA[revenueMA.length - 1] : ss.mean(revenueData);
  
  // Detect weekly patterns
  const weeklyPattern = detectWeeklyPattern(revenueData);
  
  // Generate forecast
  const forecast: PredictionResult['forecast'] = [];
  const lastDate = sortedHistory.length > 0 
    ? new Date(sortedHistory[sortedHistory.length - 1].date)
    : new Date();
  
  let totalPredicted = 0;
  const stdDev = ss.standardDeviation(revenueData) || currentAvg * 0.2;
  
  for (let i = 1; i <= daysToPredict; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    // Base prediction from regression
    const baseValue = revenueRegression.intercept + revenueRegression.slope * (revenueData.length + i);
    
    // Apply weekly seasonality
    const dayOfWeek = futureDate.getDay();
    const seasonalFactor = weeklyPattern[dayOfWeek];
    
    // Final prediction (ensure non-negative)
    const predicted = Math.max(0, baseValue * seasonalFactor);
    totalPredicted += predicted;
    
    // Confidence interval widens over time
    const uncertaintyFactor = 1 + (i / daysToPredict) * 0.5;
    const margin = stdDev * uncertaintyFactor * 1.96; // 95% CI
    
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      predicted: Math.round(predicted * 100) / 100,
      lower: Math.max(0, Math.round((predicted - margin) * 100) / 100),
      upper: Math.round((predicted + margin) * 100) / 100
    });
  }

  // Calculate trend
  const trendPercentage = currentAvg > 0 
    ? (revenueRegression.slope / currentAvg) * 100 * 30 // Monthly trend
    : 0;
  
  let trend: 'up' | 'down' | 'stable';
  if (trendPercentage > 5) trend = 'up';
  else if (trendPercentage < -5) trend = 'down';
  else trend = 'stable';

  // Calculate confidence based on R² and data amount
  const dataConfidence = Math.min(1, history.length / 30); // More data = more confidence
  const modelConfidence = revenueRegression.r2;
  const confidence = Math.round((dataConfidence * 0.4 + modelConfidence * 0.6) * 100);

  // Predict future values
  const predictedRevenue = Math.round(totalPredicted * 100) / 100;
  const predictedSubs = Math.max(0, Math.round(
    subRegression.intercept + subRegression.slope * (subData.length + daysToPredict / 2)
  ));
  const predictedBits = Math.round(ss.mean(bitsData) * daysToPredict);

  // Generate insights
  const insights = generateInsights(revenueData, trend, trendPercentage, history.length);

  return {
    predictedRevenue,
    predictedSubscribers: predictedSubs,
    predictedBits,
    confidence,
    trend,
    trendPercentage: Math.round(trendPercentage * 10) / 10,
    forecast,
    insights
  };
}

/**
 * Generate default prediction when no history exists
 */
function generateDefaultPrediction(daysToPredict: number): PredictionResult {
  const forecast: PredictionResult['forecast'] = [];
  const today = new Date();
  
  for (let i = 1; i <= daysToPredict; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      predicted: 0,
      lower: 0,
      upper: 0
    });
  }

  return {
    predictedRevenue: 0,
    predictedSubscribers: 0,
    predictedBits: 0,
    confidence: 0,
    trend: 'stable',
    trendPercentage: 0,
    forecast,
    insights: [
      '📊 Start streaming to generate revenue data',
      '💡 Predictions improve with more historical data',
      '🎯 Become a Twitch Affiliate to earn from subscriptions'
    ]
  };
}

/**
 * Generate human-readable insights
 */
function generateInsights(
  revenueData: number[],
  trend: 'up' | 'down' | 'stable',
  trendPercentage: number,
  dataPoints: number
): string[] {
  const insights: string[] = [];

  // Trend insight
  if (trend === 'up') {
    insights.push(`📈 Revenue trending up ${Math.abs(trendPercentage).toFixed(1)}% monthly`);
  } else if (trend === 'down') {
    insights.push(`📉 Revenue trending down ${Math.abs(trendPercentage).toFixed(1)}% monthly`);
  } else {
    insights.push('📊 Revenue is stable');
  }

  // Best day insight
  if (revenueData.length >= 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    
    revenueData.forEach((val, i) => {
      const day = i % 7;
      dayTotals[day] += val;
      dayCounts[day]++;
    });
    
    const dayAverages = dayTotals.map((total, i) => 
      dayCounts[i] > 0 ? total / dayCounts[i] : 0
    );
    const bestDayIndex = dayAverages.indexOf(Math.max(...dayAverages));
    insights.push(`🌟 Best performing day: ${days[bestDayIndex]}`);
  }

  // Data confidence insight
  if (dataPoints < 7) {
    insights.push('💡 More data needed for accurate predictions');
  } else if (dataPoints < 30) {
    insights.push('📅 Predictions will improve with more history');
  } else {
    insights.push('✅ Strong prediction confidence with 30+ days of data');
  }

  // Volatility insight
  if (revenueData.length > 1) {
    const cv = ss.standardDeviation(revenueData) / (ss.mean(revenueData) || 1);
    if (cv > 0.5) {
      insights.push('⚡ High revenue volatility - consider consistent streaming');
    } else if (cv < 0.2) {
      insights.push('🎯 Very consistent revenue stream');
    }
  }

  return insights.slice(0, 4); // Max 4 insights
}

export default { generatePredictions };