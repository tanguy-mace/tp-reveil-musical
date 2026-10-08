import { describe, it, expect } from 'vitest';
import { InMemoryUserRepository } from '../../../src/infrastructure/persistence/in-memory-user-repository.js';

describe('Infrastructure: InMemoryUserRepository (UserProfileProvider)', () => {
  it('retourne les préférences des utilisateurs pré-chargés', async () => {
    const repo = new InMemoryUserRepository();

    const alice = await repo.getUserPreferences('user-alice');
    expect(alice).not.toBeNull();
    expect(alice?.weatherTracks.SOLEIL).toBe('Here Comes the Sun');
    expect(alice?.preferredChannel).toBe('EMAIL');

    const bob = await repo.getUserPreferences('user-bob');
    expect(bob).not.toBeNull();
    expect(bob?.fallbackTrack).toBe('Morning Has Broken');
    expect(bob?.preferredChannel).toBe('SMS');
  });

  it('retourne null si l’utilisateur est introuvable', async () => {
    const repo = new InMemoryUserRepository();
    const result = await repo.getUserPreferences('inconnu-000');
    expect(result).toBeNull();
  });

  it('permet la sauvegarde et la suppression d’un utilisateur', async () => {
    const repo = new InMemoryUserRepository([]);

    await repo.saveUser({
      userId: 'custom-user',
      weatherTracks: { SOLEIL: 'Sunny Day' },
      fallbackTrack: 'Default Song',
      preferredChannel: 'EMAIL',
      recipientInfo: { userId: 'custom-user', email: 'custom@example.com' },
    });

    const user = await repo.getUserPreferences('custom-user');
    expect(user).not.toBeNull();
    expect(user?.weatherTracks.SOLEIL).toBe('Sunny Day');

    repo.deleteUser('custom-user');
    const deleted = await repo.getUserPreferences('custom-user');
    expect(deleted).toBeNull();
  });
});
