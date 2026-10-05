import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParams = {
  Play: undefined;
  Defis: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  Game: undefined;
  Puzzles: undefined;
  Album: undefined;
  Adventure: { world?: string; level?: number } | undefined;
  Event: { id: string; level?: number };
  Settings: { from?: 'pause' } | undefined;
};
