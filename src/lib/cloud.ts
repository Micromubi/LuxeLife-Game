import type { GameState } from '../game/types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudEnabled = Boolean(url && key);

/** Lazily create a Supabase client and sign in anonymously (enable Anonymous sign-ins in Supabase Auth). */
async function client() {
  if (!cloudEnabled) throw new Error('Supabase is not configured (.env)');
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url!, key!);
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) throw error;
  }
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error('Could not sign in');
  return { sb, userId: u.user.id };
}

export async function cloudSave(game: GameState) {
  const { sb, userId } = await client();
  const nw = game.cash + game.assets.reduce((s, a) => s + a.currentValue, 0) - game.loans.reduce((s, l) => s + l.balance, 0);
  const { error } = await sb.from('saves').upsert({ user_id: userId, state: game, updated_at: new Date().toISOString() });
  if (error) throw error;
  // Mirror the headline numbers into the players table for leaderboards later.
  await sb.from('players').upsert({
    id: userId, username: game.name, start_type: game.startType, cash_balance: game.cash, net_worth: nw,
    energy: game.needs.energy, hunger: game.needs.hunger, social: game.needs.social, prestige: Math.round(game.reputation),
  });
}

export async function cloudLoad(): Promise<GameState | null> {
  const { sb, userId } = await client();
  const { data, error } = await sb.from('saves').select('state').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.state as GameState) ?? null;
}
