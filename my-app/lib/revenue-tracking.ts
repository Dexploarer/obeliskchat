/**
 * Revenue Tracking Service for Jupiter Referral System
 * Handles revenue monitoring, analytics, and reporting
 */

import { Connection, PublicKey } from '@solana/web3.js';

export interface RevenueMetrics {
  totalSwaps: number;
  totalVolume: number; // In USD
  totalFees: number; // In USD
  platformRevenue: number; // Our 80% share
  jupiterRevenue: number; // Jupiter's 20% share
  averageSwapSize: number;
  revenueByToken: Record<string, number>;
  revenueByDay: Record<string, number>;
}

export interface SwapFeeEvent {
  signature: string;
  timestamp: number;
  tokenMint: string;
  tokenSymbol?: string;
  swapValue: number; // In USD
  feeAmount: number; // In USD
  platformShare: number; // Our revenue
  jupiterShare: number; // Jupiter's revenue
}

export class RevenueTrackingService {
  private connection: Connection;
  private referralAccount: string;
  private feeRate: number; // In basis points
  private events: SwapFeeEvent[] = [];

  constructor(connection: Connection, referralAccount?: string, feeRate: number = 50) {
    this.connection = connection;
    this.referralAccount = referralAccount || process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT || '';
    this.feeRate = feeRate;
    
    this.loadStoredEvents();
  }

  /**
   * Record a swap fee event
   */
  recordSwapFee(event: Omit<SwapFeeEvent, 'feeAmount' | 'platformShare' | 'jupiterShare'>): void {
    const feeAmount = event.swapValue * (this.feeRate / 10000); // Convert bps to decimal
    const platformShare = feeAmount * 0.8; // 80% to platform
    const jupiterShare = feeAmount * 0.2; // 20% to Jupiter

    const fullEvent: SwapFeeEvent = {
      ...event,
      feeAmount,
      platformShare,
      jupiterShare,
    };

    this.events.push(fullEvent);
    this.saveEvents();

    console.log('💰 Swap fee recorded:', {
      value: `$${event.swapValue.toFixed(2)}`,
      fee: `$${feeAmount.toFixed(4)}`,
      ourRevenue: `$${platformShare.toFixed(4)}`,
    });
  }

  /**
   * Calculate comprehensive revenue metrics
   */
  getRevenueMetrics(timeframe?: { start: number; end: number }): RevenueMetrics {
    let filteredEvents = this.events;

    if (timeframe) {
      filteredEvents = this.events.filter(
        event => event.timestamp >= timeframe.start && event.timestamp <= timeframe.end
      );
    }

    const totalSwaps = filteredEvents.length;
    const totalVolume = filteredEvents.reduce((sum, event) => sum + event.swapValue, 0);
    const totalFees = filteredEvents.reduce((sum, event) => sum + event.feeAmount, 0);
    const platformRevenue = filteredEvents.reduce((sum, event) => sum + event.platformShare, 0);
    const jupiterRevenue = filteredEvents.reduce((sum, event) => sum + event.jupiterShare, 0);
    const averageSwapSize = totalSwaps > 0 ? totalVolume / totalSwaps : 0;

    // Revenue by token
    const revenueByToken: Record<string, number> = {};
    filteredEvents.forEach(event => {
      const key = event.tokenSymbol || event.tokenMint;
      revenueByToken[key] = (revenueByToken[key] || 0) + event.platformShare;
    });

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    filteredEvents.forEach(event => {
      const day = new Date(event.timestamp).toISOString().split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + event.platformShare;
    });

    return {
      totalSwaps,
      totalVolume,
      totalFees,
      platformRevenue,
      jupiterRevenue,
      averageSwapSize,
      revenueByToken,
      revenueByDay,
    };
  }

  /**
   * Get revenue summary for display
   */
  getRevenueSummary(): {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  } {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const daily = this.getRevenueMetrics({
      start: now - oneDay,
      end: now,
    }).platformRevenue;

    const weekly = this.getRevenueMetrics({
      start: now - oneWeek,
      end: now,
    }).platformRevenue;

    const monthly = this.getRevenueMetrics({
      start: now - oneMonth,
      end: now,
    }).platformRevenue;

    const allTime = this.getRevenueMetrics().platformRevenue;

    return { daily, weekly, monthly, allTime };
  }

  /**
   * Get top performing tokens by revenue
   */
  getTopTokens(limit: number = 10): Array<{ token: string; revenue: number; swaps: number }> {
    const tokenStats: Record<string, { revenue: number; swaps: number }> = {};

    this.events.forEach(event => {
      const key = event.tokenSymbol || event.tokenMint;
      if (!tokenStats[key]) {
        tokenStats[key] = { revenue: 0, swaps: 0 };
      }
      tokenStats[key].revenue += event.platformShare;
      tokenStats[key].swaps += 1;
    });

    return Object.entries(tokenStats)
      .map(([token, stats]) => ({ token, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Check actual SOL balance of referral account
   */
  async getReferralAccountBalance(): Promise<number> {
    if (!this.referralAccount) {
      throw new Error('No referral account configured');
    }

    try {
      const publicKey = new PublicKey(this.referralAccount);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to get referral account balance:', error);
      return 0;
    }
  }

  /**
   * Export revenue data for external analysis
   */
  exportRevenueData(): {
    config: {
      referralAccount: string;
      feeRate: number;
    };
    metrics: RevenueMetrics;
    events: SwapFeeEvent[];
  } {
    return {
      config: {
        referralAccount: this.referralAccount,
        feeRate: this.feeRate,
      },
      metrics: this.getRevenueMetrics(),
      events: this.events,
    };
  }

  /**
   * Generate revenue report
   */
  generateReport(): string {
    const metrics = this.getRevenueMetrics();
    const summary = this.getRevenueSummary();
    const topTokens = this.getTopTokens(5);

    return `
📊 Jupiter Referral Revenue Report
================================

💰 Revenue Summary:
   • Total Revenue: $${metrics.platformRevenue.toFixed(2)}
   • Daily: $${summary.daily.toFixed(2)}
   • Weekly: $${summary.weekly.toFixed(2)}
   • Monthly: $${summary.monthly.toFixed(2)}

📈 Trading Metrics:
   • Total Swaps: ${metrics.totalSwaps.toLocaleString()}
   • Total Volume: $${metrics.totalVolume.toLocaleString()}
   • Average Swap: $${metrics.averageSwapSize.toFixed(2)}
   • Total Fees: $${metrics.totalFees.toFixed(2)}

🎯 Fee Distribution:
   • Platform Share (80%): $${metrics.platformRevenue.toFixed(2)}
   • Jupiter Share (20%): $${metrics.jupiterRevenue.toFixed(2)}

🏆 Top Tokens by Revenue:
${topTokens.map((token, i) => 
  `   ${i + 1}. ${token.token}: $${token.revenue.toFixed(2)} (${token.swaps} swaps)`
).join('\n')}

⚙️ Configuration:
   • Referral Account: ${this.referralAccount}
   • Fee Rate: ${this.feeRate / 100}% (${this.feeRate} bps)
`;
  }

  /**
   * Load events from localStorage
   */
  private loadStoredEvents(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('jupiter-revenue-events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored revenue events:', error);
      this.events = [];
    }
  }

  /**
   * Save events to localStorage
   */
  private saveEvents(): void {
    if (typeof window === 'undefined') return;

    try {
      // Keep only last 1000 events to prevent storage bloat
      const eventsToStore = this.events.slice(-1000);
      localStorage.setItem('jupiter-revenue-events', JSON.stringify(eventsToStore));
    } catch (error) {
      console.warn('Failed to save revenue events:', error);
    }
  }

  /**
   * Clear all stored events (for testing/reset)
   */
  clearEvents(): void {
    this.events = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jupiter-revenue-events');
    }
  }
}

// Export singleton instance
let revenueTracker: RevenueTrackingService | null = null;

export function getRevenueTracker(connection?: Connection): RevenueTrackingService {
  if (!revenueTracker && connection) {
    revenueTracker = new RevenueTrackingService(connection);
  }
  
  if (!revenueTracker) {
    throw new Error('Revenue tracker not initialized. Provide a connection on first call.');
  }
  
  return revenueTracker;
}

// Utility function to estimate fees for a swap
export function estimateSwapFee(swapValueUSD: number, feeRate: number = 50): {
  totalFee: number;
  platformRevenue: number;
  jupiterRevenue: number;
} {
  const totalFee = swapValueUSD * (feeRate / 10000);
  const platformRevenue = totalFee * 0.8;
  const jupiterRevenue = totalFee * 0.2;

  return {
    totalFee,
    platformRevenue,
    jupiterRevenue,
  };
}