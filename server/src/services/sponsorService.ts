import { Sponsor } from 'agla-station-shared';
import sponsorsData from '../../data/sponsors.json';

const allSponsors: Sponsor[] = sponsorsData as Sponsor[];

export class SponsorService {
  private sponsorsMap: Map<string, Sponsor[]> = new Map();
  private cursorMap: Map<string, number> = new Map();

  constructor() {
    this.indexSponsors();
  }

  private indexSponsors() {
    const now = new Date().toISOString();
    for (const sp of allSponsors) {
      // Check active dates
      if (sp.validFrom && sp.validFrom > now) continue;
      if (sp.validTo && sp.validTo < now) continue;

      const list = this.sponsorsMap.get(sp.stationId) || [];
      list.push(sp);
      this.sponsorsMap.set(sp.stationId, list);
    }
  }

  /**
   * Attaches at most ONE active sponsor to a station advance event.
   * If multiple sponsors exist for a station, rotates round-robin.
   */
  public getSponsorForStation(stationId: string): Sponsor | null {
    const list = this.sponsorsMap.get(stationId);
    if (!list || list.length === 0) {
      return null;
    }

    const cursor = this.cursorMap.get(stationId) || 0;
    const selected = list[cursor % list.length];
    this.cursorMap.set(stationId, cursor + 1);

    return selected;
  }
}

export const sponsorService = new SponsorService();
