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
  Adventure: { world?: string; level?: number } | undefined;
  Settings: { from?: 'pause' } | undefined;
};
