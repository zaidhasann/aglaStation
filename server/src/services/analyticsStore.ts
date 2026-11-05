import fs from 'fs';
import path from 'path';

export interface DailyLineHourStats {
  lineId: string;
  hour: number; // 0-23
  listenerPings: number;
}

export interface SponsorStats {
  sponsorId: string;
  stationId: string;
  impressions: number;
  dismissals: number;
  taps: number;
}

export interface AggregateAnalytics {
  date: string; // YYYY-MM-DD
  activeListenersByLineAndHour: Record<string, Record<number, number>>; // lineId -> hour -> count
  totalRidesCompleted: number;
  totalRideSeconds: number;
  averageRideLengthSec: number;
  chatRequestsSent: number;
  chatRequestsAccepted: number;
  sponsorStats: Record<string, SponsorStats>; // sponsorId -> stats
}

export class AnalyticsStore {
  private filePath: string;
  private currentData: AggregateAnalytics;

  constructor() {
    this.filePath = path.resolve(__dirname, '../../analytics.json');
    this.currentData = this.loadOrInit();
  }

  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private loadOrInit(): AggregateAnalytics {
    const today = this.getTodayKey();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.date === today) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[AnalyticsStore] Could not read analytics file, creating fresh store.', e);
    }

    return {
      date: today,
      activeListenersByLineAndHour: {},
      totalRidesCompleted: 0,
      totalRideSeconds: 0,
      averageRideLengthSec: 0,
      chatRequestsSent: 0,
      chatRequestsAccepted: 0,
      sponsorStats: {},
    };
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.currentData, null, 2), 'utf8');
    } catch (e) {
      console.error('[AnalyticsStore] Failed to write analytics.json', e);
    }
  }

  /**
   * Tracks an active listener ping on a specific line.
   * Completely anonymous — strictly aggregate counts.
   */
  public recordListenerPresence(lineId: string) {
    const today = this.getTodayKey();
    if (this.currentData.date !== today) {
      this.currentData = this.loadOrInit();
    }

    const hour = new Date().getHours();
    if (!this.currentData.activeListenersByLineAndHour[lineId]) {
      this.currentData.activeListenersByLineAndHour[lineId] = {};
    }
    const currentCount = this.currentData.activeListenersByLineAndHour[lineId][hour] || 0;
    this.currentData.activeListenersByLineAndHour[lineId][hour] = currentCount + 1;
    this.persist();
  }

  /**
   * Records a completed ride duration in seconds.
   */
  public recordRideDuration(durationSec: number) {
    if (durationSec <= 0) return;
    this.currentData.totalRidesCompleted += 1;
    this.currentData.totalRideSeconds += durationSec;
    this.currentData.averageRideLengthSec = Math.round(
      this.currentData.totalRideSeconds / this.currentData.totalRidesCompleted
    );
    this.persist();
  }

  /**
   * Tracks chat request engagement metrics.
   */
  public recordChatRequestSent() {
    this.currentData.chatRequestsSent += 1;
    this.persist();
  }

  public recordChatRequestAccepted() {
    this.currentData.chatRequestsAccepted += 1;
    this.persist();
  }

  /**
   * Records sponsor impression, dismissal, or tap in aggregate.
   */
  public recordSponsorAction(sponsorId: string, stationId: string, action: 'impression' | 'dismiss' | 'tap') {
    if (!this.currentData.sponsorStats[sponsorId]) {
      this.currentData.sponsorStats[sponsorId] = {
        sponsorId,
        stationId,
        impressions: 0,
        dismissals: 0,
        taps: 0,
      };
    }

    const stats = this.currentData.sponsorStats[sponsorId];
    if (action === 'impression') stats.impressions += 1;
    if (action === 'dismiss') stats.dismissals += 1;
    if (action === 'tap') stats.taps += 1;

    this.persist();
  }

  public getDailyStats(): AggregateAnalytics {
    return this.currentData;
  }
}

export const analyticsStore = new AnalyticsStore();
