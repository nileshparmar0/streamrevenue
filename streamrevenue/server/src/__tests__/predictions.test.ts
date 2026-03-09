/**
 * Tests for ML Revenue Predictions Service
 */

// Mock the database before importing predictions
jest.mock('../services/database', () => ({
  getRevenueHistory: jest.fn()
}));

import { getRevenueHistory } from '../services/database';

// Import after mocking
const mockGetRevenueHistory = getRevenueHistory as jest.MockedFunction<typeof getRevenueHistory>;

// We need to import the module dynamically after mocking
let generatePredictions: any;

beforeAll(async () => {
  const predictions = await import('../services/predictions');
  generatePredictions = predictions.generatePredictions;
});

interface ForecastDay {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

describe('Revenue Predictions Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePredictions', () => {
    it('should return default predictions when no history exists', async () => {
      mockGetRevenueHistory.mockResolvedValue([]);

      const result = await generatePredictions('user123', 30);

      expect(result).toHaveProperty('predictedRevenue', 0);
      expect(result).toHaveProperty('predictedSubscribers', 0);
      expect(result).toHaveProperty('confidence', 0);
      expect(result).toHaveProperty('trend', 'stable');
      expect(result).toHaveProperty('forecast');
      expect(result.forecast).toHaveLength(30);
      expect(result.insights).toContain('📊 Start streaming to generate revenue data');
    });

    it('should generate predictions with historical data', async () => {
      const mockHistory = [
        { date: '2024-03-01', total_revenue: '10.00', subscriber_count: '4', bits_total: '500' },
        { date: '2024-03-02', total_revenue: '12.00', subscriber_count: '5', bits_total: '600' },
        { date: '2024-03-03', total_revenue: '15.00', subscriber_count: '6', bits_total: '700' },
        { date: '2024-03-04', total_revenue: '14.00', subscriber_count: '5', bits_total: '650' },
        { date: '2024-03-05', total_revenue: '18.00', subscriber_count: '7', bits_total: '800' },
        { date: '2024-03-06', total_revenue: '20.00', subscriber_count: '8', bits_total: '900' },
        { date: '2024-03-07', total_revenue: '22.00', subscriber_count: '9', bits_total: '1000' },
      ];

      mockGetRevenueHistory.mockResolvedValue(mockHistory);

      const result = await generatePredictions('user123', 30);

      expect(result.predictedRevenue).toBeGreaterThan(0);
      expect(result.forecast).toHaveLength(30);
      expect(result.confidence).toBeGreaterThan(0);
      expect(['up', 'down', 'stable']).toContain(result.trend);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect upward trend', async () => {
      const mockHistory = Array.from({ length: 14 }, (_, i) => ({
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        total_revenue: String((i + 1) * 10), // 10, 20, 30... increasing
        subscriber_count: String(i + 1),
        bits_total: String((i + 1) * 100)
      }));

      mockGetRevenueHistory.mockResolvedValue(mockHistory);

      const result = await generatePredictions('user123', 30);

      expect(result.trend).toBe('up');
      expect(result.trendPercentage).toBeGreaterThan(0);
    });

    it('should detect downward trend', async () => {
      const mockHistory = Array.from({ length: 14 }, (_, i) => ({
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        total_revenue: String((14 - i) * 10), // 140, 130, 120... decreasing
        subscriber_count: String(14 - i),
        bits_total: String((14 - i) * 100)
      }));

      mockGetRevenueHistory.mockResolvedValue(mockHistory);

      const result = await generatePredictions('user123', 30);

      expect(result.trend).toBe('down');
      expect(result.trendPercentage).toBeLessThan(0);
    });

    it('should generate correct number of forecast days', async () => {
      mockGetRevenueHistory.mockResolvedValue([]);

      const result7 = await generatePredictions('user123', 7);
      const result60 = await generatePredictions('user123', 60);

      expect(result7.forecast).toHaveLength(7);
      expect(result60.forecast).toHaveLength(60);
    });

    it('should include forecast with confidence intervals', async () => {
      const mockHistory = [
        { date: '2024-03-01', total_revenue: '10.00', subscriber_count: '4', bits_total: '500' },
        { date: '2024-03-02', total_revenue: '12.00', subscriber_count: '5', bits_total: '600' },
      ];

      mockGetRevenueHistory.mockResolvedValue(mockHistory);

      const result = await generatePredictions('user123', 7);

      result.forecast.forEach((day: ForecastDay) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('predicted');
        expect(day).toHaveProperty('lower');
        expect(day).toHaveProperty('upper');
        expect(day.lower).toBeLessThanOrEqual(day.predicted);
        expect(day.upper).toBeGreaterThanOrEqual(day.predicted);
      });
    });
  });
});