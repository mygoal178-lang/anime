// AniVault Anime Avatar System
// 16 unique, non-copyrighted original anime character avatars

export interface AnimeAvatarOption {
  id: string;
  name: string;
  url: string;
  style: string;
}

export const ANIME_AVATARS: AnimeAvatarOption[] = [
  { id: 'avatar-01', name: 'Shadow Ninja', url: '/avatars/avatar-01.svg', style: 'Ninja' },
  { id: 'avatar-02', name: 'Sakura Mage', url: '/avatars/avatar-02.svg', style: 'Anime Girl / Mage' },
  { id: 'avatar-03', name: 'Cyberpunk Netrunner', url: '/avatars/avatar-03.svg', style: 'Cyberpunk' },
  { id: 'avatar-04', name: 'Flame Brawler', url: '/avatars/avatar-04.svg', style: 'Anime Boy / Warrior' },
  { id: 'avatar-05', name: 'Cosmic Sorceress', url: '/avatars/avatar-05.svg', style: 'Fantasy / Sorceress' },
  { id: 'avatar-06', name: 'Ronin Blade', url: '/avatars/avatar-06.svg', style: 'Samurai' },
  { id: 'avatar-07', name: 'Golden Paladin', url: '/avatars/avatar-07.svg', style: 'Paladin / Knight' },
  { id: 'avatar-08', name: 'Mecha Pilot', url: '/avatars/avatar-08.svg', style: 'Sci-Fi / Mecha' },
  { id: 'avatar-09', name: 'Forest Ranger', url: '/avatars/avatar-09.svg', style: 'Elven / Archer' },
  { id: 'avatar-10', name: 'Spirit Kitsune', url: '/avatars/avatar-10.svg', style: 'Kitsune / Shrine' },
  { id: 'avatar-11', name: 'Phantom Reaper', url: '/avatars/avatar-11.svg', style: 'Gothic / Reaper' },
  { id: 'avatar-12', name: 'Astral Alchemist', url: '/avatars/avatar-12.svg', style: 'Scholar / Alchemist' },
  { id: 'avatar-13', name: 'Dragon Slayer', url: '/avatars/avatar-13.svg', style: 'Dragon Warrior' },
  { id: 'avatar-14', name: 'Starlight Idol', url: '/avatars/avatar-14.svg', style: 'School / Idol' },
  { id: 'avatar-15', name: 'Shadow Assassin', url: '/avatars/avatar-15.svg', style: 'Stealth / Assassin' },
  { id: 'avatar-16', name: 'Celestial Sage', url: '/avatars/avatar-16.svg', style: 'Celestial / Sage' },
];

export const DEFAULT_FALLBACK_AVATAR = '/avatars/avatar-01.svg';

/**
 * Randomly pick one avatar from the 16 anime options on new registration
 */
export function getRandomAvatar(): string {
  const index = Math.floor(Math.random() * ANIME_AVATARS.length);
  return ANIME_AVATARS[index].url;
}

/**
 * Deterministically pick an avatar based on a unique seed (User ID, email, or name).
 * Ensures existing users or sessions without an explicit avatar always get the exact
 * same consistent anime avatar every time they visit.
 */
export function getDeterministicAvatar(seed?: string | null): string {
  if (!seed || typeof seed !== 'string' || !seed.trim()) {
    return DEFAULT_FALLBACK_AVATAR;
  }
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % ANIME_AVATARS.length;
  return ANIME_AVATARS[index].url;
}

/**
 * Safely resolves a user's avatar with fallbacks.
 * Returns the stored avatar URL if present and valid,
 * or deterministically calculates one from the provided seed (user ID / email),
 * never returning an empty string or null.
 */
export function getSafeAvatar(avatarUrl?: string | null, seed?: string | null): string {
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
    // If it's a relative path starting with avatars/ without slash, fix it
    if (avatarUrl.startsWith('avatars/')) {
      return `/${avatarUrl}`;
    }
    return avatarUrl.trim();
  }
  return getDeterministicAvatar(seed);
}
