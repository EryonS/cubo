import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParams = {
  Play: undefined;
  Defis: undefined;
  Shop: { tab?: 'boards' | 'blocks' | 'cubo' | 'bonus' } | undefined;
  Profile: undefined;
};

export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  Game: undefined;
  Puzzles: undefined;
  Album: undefined;
  Community: undefined;
  Ranking: { scope?: 'league' | 'friends' } | undefined;
  Adventure: { world?: string } | undefined;
  Event: { id: string; level?: number };
  Settings: { from?: 'pause' } | undefined;
};
