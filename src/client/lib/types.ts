export type ActionKind =
  | 'remove'
  | 'approve'
  | 'lock'
  | 'comment'
  | 'report'
  | 'ban'
  | 'userFlair';

export type EventRecord = {
  ts: number;
  activityId: string;
  runName?: string;
  checkName?: string;
  triggered: boolean;
  actions: { kind: ActionKind; ok: boolean }[];
};

export type StatsRollup = {
  actionsToday: number;
  timeSavedMin: number;
  activeRules: number;
  topRule: string;
  hourlyActions24h: number[]; // 24 ints
};
