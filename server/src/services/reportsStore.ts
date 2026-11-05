import fs from 'fs';
import path from 'path';

export interface StoredReport {
  id: string;
  reporterPublicId: string;
  targetPublicId: string;
  reason: string;
  timestamp: number;
}

export class ReportsStore {
  private filePath: string;
  private reports: StoredReport[] = [];
  // targetPublicId -> Set of distinct reporterPublicIds
  private reportsByTarget: Map<string, Set<string>> = new Map();
  // Set of muted publicIds
  private mutedUsers: Set<string> = new Set();

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'reports.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.reports = JSON.parse(raw);
        for (const rep of this.reports) {
          if (!this.reportsByTarget.has(rep.targetPublicId)) {
            this.reportsByTarget.set(rep.targetPublicId, new Set());
          }
          this.reportsByTarget.get(rep.targetPublicId)!.add(rep.reporterPublicId);
        }
        // Calculate muted
        for (const [target, reporters] of this.reportsByTarget.entries()) {
          if (reporters.size >= 3) {
            this.mutedUsers.add(target);
          }
        }
      }
    } catch (err) {
      console.error('[ReportsStore] Failed to load reports file:', err);
      this.reports = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.reports, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ReportsStore] Failed to save reports file:', err);
    }
  }

  public addReport(reporterPublicId: string, targetPublicId: string, reason: string): { isMuted: boolean } {
    const report: StoredReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reporterPublicId,
      targetPublicId,
      reason: reason.slice(0, 500),
      timestamp: Date.now(),
    };

    this.reports.push(report);
    this.save();

    if (!this.reportsByTarget.has(targetPublicId)) {
      this.reportsByTarget.set(targetPublicId, new Set());
    }
    const reporters = this.reportsByTarget.get(targetPublicId)!;
    reporters.add(reporterPublicId);

    const isMuted = reporters.size >= 3;
    if (isMuted) {
      this.mutedUsers.add(targetPublicId);
      console.warn(`[ReportsStore] User ${targetPublicId} has received reports from ${reporters.size} distinct users and is now MUTED for chat requests.`);
    }

    return { isMuted };
  }

  public isMuted(publicId: string): boolean {
    return this.mutedUsers.has(publicId);
  }

  public getAllReports(): StoredReport[] {
    return [...this.reports];
  }

  public getReportsSummary() {
    return {
      totalReports: this.reports.length,
      mutedUsersCount: this.mutedUsers.size,
      reports: this.reports.slice(-50), // Last 50 reports
    };
  }
}
