import { generatePassword } from '@/lib/password';

describe('generatePassword', () => {
  it('returns the requested length with every character class', () => {
    for (let run = 0; run < 50; run++) {
      const password = generatePassword();
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[2-9]/);
      expect(password).toMatch(/[!@#$%*\-_]/);
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });

  it('does not repeat itself', () => {
    const passwords = new Set(Array.from({ length: 100 }, () => generatePassword()));
    expect(passwords.size).toBe(100);
  });
});
